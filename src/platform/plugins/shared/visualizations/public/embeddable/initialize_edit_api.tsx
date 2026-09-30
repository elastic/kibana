/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PanelSettingsApi } from '@kbn/embeddable-plugin/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { apiHasAppContext, apiPublishesTimeRange } from '@kbn/presentation-publishing';
import type { TimeRange } from '@kbn/es-query';
import type { Vis } from '../vis';
import { urlFor } from '..';
import { getCapabilities, getCoreStart, getEmbeddable } from '../services';
import type { VisualizeEmbeddableState } from '../../common/embeddable/types';

export function initializeEditApi({
  customTimeRange$,
  description$,
  getSerializedState,
  panelSettingsApi,
  parentApi,
  savedObjectId$,
  searchSessionId$,
  title$,
  vis$,
  uuid,
}: {
  customTimeRange$: PublishingSubject<TimeRange | undefined>;
  description$: PublishingSubject<string | undefined>;
  /** Used to render a preview of the panel in the edit flyout */
  getSerializedState: () => VisualizeEmbeddableState;
  /** Title, description, border and time range settings, edited in the edit flyout */
  panelSettingsApi?: PanelSettingsApi;
  parentApi?: unknown;
  savedObjectId$: PublishingSubject<string | undefined>;
  searchSessionId$: PublishingSubject<string | undefined>;
  title$: PublishingSubject<string | undefined>;
  vis$: PublishingSubject<Vis>;
  uuid: string;
}) {
  if (!parentApi || !apiHasAppContext(parentApi)) return {};

  const isEditingEnabled = () => {
    const readOnly = Boolean(vis$.getValue().type.disableEdit);
    if (readOnly) return false;
    const capabilities = getCapabilities();
    const isByValue = !savedObjectId$.getValue();
    if (isByValue)
      return Boolean(
        capabilities.dashboard_v2?.showWriteControls && capabilities.visualize_v2?.show
      );
    else return Boolean(capabilities.visualize_v2?.save);
  };

  const navigateToEditor = async () => {
    const stateTransferService = getEmbeddable().getStateTransfer();
    const visId = savedObjectId$.getValue();
    const editPath = visId ? urlFor(visId) : '#/edit_by_value';
    const parentTimeRange = apiPublishesTimeRange(parentApi) ? parentApi.timeRange$.getValue() : {};
    const customTimeRange = customTimeRange$.getValue();
    const parentApiContext = parentApi.getAppContext();

    await stateTransferService.navigateToEditor('visualize', {
      path: editPath,
      state: {
        embeddableId: uuid,
        valueInput: {
          savedVis: vis$.getValue().serialize(),
          title: title$.getValue(),
          description: description$.getValue(),
          timeRange: customTimeRange ?? parentTimeRange,
        },
        originatingApp: parentApiContext?.currentAppId,
        searchSessionId: searchSessionId$.getValue() || undefined,
        originatingPath: parentApiContext?.getCurrentPath?.(),
      },
    });
  };

  return {
    getTypeDisplayName: () =>
      i18n.translate('visualizations.displayName', {
        defaultMessage: 'visualization',
      }),
    onEdit: async () => {
      const vis = vis$.getValue();
      if (!vis.type.editInFlyout || !panelSettingsApi) {
        return navigateToEditor();
      }
      openLazyFlyout({
        core: getCoreStart(),
        parentApi,
        loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
          const { VisEditFlyout } = await import('./edit_flyout/vis_edit_flyout');
          return (
            <VisEditFlyout
              api={panelSettingsApi}
              parentApi={parentApi}
              getState={getSerializedState}
              visTypeTitle={vis.type.title}
              navigateToEditor={navigateToEditor}
              closeFlyout={closeFlyout}
              ariaLabelledBy={ariaLabelledBy}
            />
          );
        },
        flyoutProps: {
          'data-test-subj': 'panelEditFlyout',
          focusedPanelId: uuid,
        },
      });
    },
    isEditingEnabled,
    // the edit flyout, which includes the panel settings, is only used by some vis types
    hasPanelSettingsInEditFlyout: () =>
      Boolean(panelSettingsApi) && vis$.getValue().type.editInFlyout && isEditingEnabled(),
  };
}
