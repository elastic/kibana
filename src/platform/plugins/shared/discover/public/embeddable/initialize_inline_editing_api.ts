/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, skip, filter, map } from 'rxjs';
import type { Observable } from 'rxjs';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import { apiCanFocusPanel, apiPublishesSavedObjectId } from '@kbn/presentation-publishing';
import type { SearchEmbeddablePanelTab, SearchEmbeddableSessionTab } from './types';
import {
  DISCOVER_IN_DASHBOARD_EVENT_TYPE,
  DiscoverInDashboardEventDataKeys,
  DiscoverInDashboardEventName,
} from '../ebt_manager/discover_in_dashboard_event_definition';

interface SearchEmbeddableDeps {
  getTab: () => SearchEmbeddablePanelTab;
  reinitializeState: (panelTab: SearchEmbeddablePanelTab) => Promise<void>;
}

export interface InlineEditingApi {
  anyStateChange$: Observable<undefined>;
  draftSelectedTabId$: BehaviorSubject<string | undefined>;
  inlineEditDirty$: BehaviorSubject<boolean>;
  isInlineEditing$: BehaviorSubject<boolean>;
  overrideHoverActions$: BehaviorSubject<boolean>;
  applyInlineTabSelection: () => Promise<void>;
  cancelInlineTabSelection: () => Promise<void>;
  isEditing: () => boolean;
  previewInlineTabSelection: (tabId: string) => Promise<void>;
  startInlineEditing: () => Promise<void>;
  stopInlineEditing: () => void;
}

export const initializeInlineEditingApi = ({
  uuid,
  parentApi,
  tabs,
  analytics,
  selectedTabId$,
  savedObjectId$,
  searchEmbeddable,
  setSearchError,
  dataLoading$,
}: {
  uuid: string;
  parentApi: unknown;
  tabs: SearchEmbeddableSessionTab[];
  analytics: AnalyticsServiceStart;
  selectedTabId$: BehaviorSubject<string | undefined>;
  savedObjectId$: BehaviorSubject<string | undefined>;
  searchEmbeddable: SearchEmbeddableDeps;
  setSearchError: (error: Error | undefined) => void;
  dataLoading$: BehaviorSubject<boolean | undefined>;
}): InlineEditingApi => {
  const draftSelectedTabId$ = new BehaviorSubject<string | undefined>(selectedTabId$.getValue());
  const isInlineEditing$ = new BehaviorSubject<boolean>(false);
  const inlineEditDirty$ = new BehaviorSubject<boolean>(false);
  const overrideHoverActions$ = isInlineEditing$;

  // Tab shown before editing, captured on the first tab switch; if set, discard restores it
  let inlineEditStateSnapshot: SearchEmbeddablePanelTab | undefined;

  const applyEmbeddableState = async (panelTab: SearchEmbeddablePanelTab): Promise<boolean> => {
    setSearchError(undefined);

    try {
      await searchEmbeddable.reinitializeState(panelTab);
      return true;
    } catch (error) {
      setSearchError(error as Error);
      dataLoading$.next(false);
      return false;
    }
  };

  const setFocusedPanelId = (panelId?: string) => {
    if (apiCanFocusPanel(parentApi)) {
      parentApi.setFocusedPanelId(panelId);
    }
  };

  const switchTab = async (tabId: string): Promise<boolean> => {
    const tab = tabs.find((t) => t.id === tabId);

    if (!tab || !isInlineEditing$.getValue()) return false;

    inlineEditStateSnapshot ??= searchEmbeddable.getTab();

    return applyEmbeddableState(tab);
  };

  const restoreInlineEditSnapshot = async () => {
    if (inlineEditStateSnapshot) {
      await applyEmbeddableState(inlineEditStateSnapshot);
    }
  };

  const stopInlineEditing = () => {
    isInlineEditing$.next(false);
    inlineEditDirty$.next(false);
    draftSelectedTabId$.next(selectedTabId$.getValue());

    inlineEditStateSnapshot = undefined;

    setFocusedPanelId();
  };

  const startInlineEditing = async () => {
    if (isInlineEditing$.getValue()) return;

    draftSelectedTabId$.next(selectedTabId$.getValue());
    isInlineEditing$.next(true);

    setFocusedPanelId(uuid);
  };

  const previewInlineTabSelection = async (tabId: string) => {
    if (!isInlineEditing$.getValue()) return;
    if (draftSelectedTabId$.getValue() === tabId) return;

    const previousDraftTabId = draftSelectedTabId$.getValue();

    draftSelectedTabId$.next(tabId);

    const didSwitch = await switchTab(tabId);

    if (didSwitch) {
      inlineEditDirty$.next(true);
    } else {
      draftSelectedTabId$.next(previousDraftTabId);
    }
  };

  const applyInlineTabSelection = async () => {
    if (!isInlineEditing$.getValue()) return;

    const draftTabId = draftSelectedTabId$.getValue();
    const committedTabId = selectedTabId$.getValue();

    if (!draftTabId || draftTabId === committedTabId) {
      // Nothing to commit, so this is a discard
      await restoreInlineEditSnapshot();
      stopInlineEditing();
      return;
    }

    if (!tabs.some((tab) => tab.id === draftTabId)) return;

    selectedTabId$.next(draftTabId);
    stopInlineEditing();

    analytics.reportEvent(DISCOVER_IN_DASHBOARD_EVENT_TYPE, {
      [DiscoverInDashboardEventDataKeys.EVENT_NAME]: DiscoverInDashboardEventName.tabSwitched,
      [DiscoverInDashboardEventDataKeys.DASHBOARD_ID]: apiPublishesSavedObjectId(parentApi)
        ? parentApi.savedObjectId$.getValue() ?? 'new'
        : undefined,
      [DiscoverInDashboardEventDataKeys.EMBEDDABLE_PANEL_ID]: uuid,
      [DiscoverInDashboardEventDataKeys.SAVED_SESSION_ID]: savedObjectId$.getValue(),
      [DiscoverInDashboardEventDataKeys.TAB_SWITCHED_FROM_ID]: committedTabId,
      [DiscoverInDashboardEventDataKeys.TAB_SWITCHED_TO_ID]: draftTabId,
    });
  };

  const cancelInlineTabSelection = async () => {
    if (!isInlineEditing$.getValue()) return;

    await restoreInlineEditSnapshot();
    stopInlineEditing();
  };

  return {
    anyStateChange$: isInlineEditing$.pipe(
      skip(1),
      filter((isEditing) => !isEditing),
      map(() => undefined)
    ),
    draftSelectedTabId$,
    inlineEditDirty$,
    isInlineEditing$,
    overrideHoverActions$,
    applyInlineTabSelection,
    cancelInlineTabSelection,
    isEditing: () => isInlineEditing$.getValue(),
    previewInlineTabSelection,
    startInlineEditing,
    stopInlineEditing,
  };
};
