/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, compareFilters, Filter, Query, TimeRange } from '@kbn/es-query';
import type { ErrorLike } from '@kbn/expressions-plugin/common';
import { i18n } from '@kbn/i18n';
import deepEqual from 'fast-deep-equal';
import { BehaviorSubject, Subscription } from 'rxjs';
import { embeddableStart } from '../../../kibana_services';
import { isFilterableEmbeddable } from '../../filterable_embeddable';
import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
  LegacyEmbeddableAPI,
} from '../i_embeddable';
import { canEditEmbeddable, editLegacyEmbeddable } from './edit_legacy_embeddable';
import {
  embeddableInputToSubject,
  embeddableOutputToSubject,
  viewModeToSubject,
} from './embeddable_compatibility_utils';
import { canLinkLegacyEmbeddable, linkLegacyEmbeddable } from './link_legacy_embeddable';
import { canUnlinkLegacyEmbeddable, unlinkLegacyEmbeddable } from './unlink_legacy_embeddable';

export type CommonLegacyInput = EmbeddableInput & { timeRange: TimeRange };
export type CommonLegacyOutput = EmbeddableOutput & { indexPatterns: DataView[] };
export type CommonLegacyEmbeddable = IEmbeddable<CommonLegacyInput, CommonLegacyOutput>;

type VisualizeEmbeddable = IEmbeddable<{ id: string }, EmbeddableOutput & { visTypeName: string }>;
function isVisualizeEmbeddable(
  embeddable: IEmbeddable | VisualizeEmbeddable
): embeddable is VisualizeEmbeddable {
  return embeddable.type === 'visualization';
}

export const legacyEmbeddableToApi = (
  embeddable: CommonLegacyEmbeddable
): { api: Omit<LegacyEmbeddableAPI, 'type' | 'getInspectorAdapters'>; destroyAPI: () => void } => {
  const subscriptions = new Subscription();

  /**
   * Shortcuts for creating publishing subjects from the input and output subjects
   */
  const inputKeyToSubject = <T extends unknown = unknown>(
    key: keyof CommonLegacyInput,
    useExplicitInput?: boolean
  ) => embeddableInputToSubject<T>(subscriptions, embeddable, key, useExplicitInput);
  const outputKeyToSubject = <T extends unknown = unknown>(key: keyof CommonLegacyOutput) =>
    embeddableOutputToSubject<T>(subscriptions, embeddable, key);

  /**
   * Support editing of legacy embeddables
   */
  const onEdit = () => editLegacyEmbeddable(embeddable);
  const getTypeDisplayName = () =>
    embeddableStart.getEmbeddableFactory(embeddable.type)?.getDisplayName() ??
    i18n.translate('embeddableApi.compatibility.defaultTypeDisplayName', {
      defaultMessage: 'chart',
    });
  const isEditingEnabled = () => canEditEmbeddable(embeddable);

  /**
   * Publish state for Presentation panel
   */
  const viewMode = viewModeToSubject(subscriptions, embeddable);
  const dataLoading = outputKeyToSubject<boolean>('loading');

  const setHidePanelTitle = (hidePanelTitle?: boolean) =>
    embeddable.updateInput({ hidePanelTitles: hidePanelTitle });
  const hidePanelTitle = inputKeyToSubject<boolean>('hidePanelTitles');

  const setPanelTitle = (title?: string) => embeddable.updateInput({ title });
  const panelTitle = inputKeyToSubject<string>('title');

  const setPanelDescription = (description?: string) => embeddable.updateInput({ description });
  const panelDescription = inputKeyToSubject<string>('description');

  const defaultPanelTitle = outputKeyToSubject<string>('defaultTitle');
  const disabledActionIds = inputKeyToSubject<string[] | undefined>('disabledActions');

  const blockingError = new BehaviorSubject<ErrorLike | undefined>(undefined);
  subscriptions.add(
    embeddable.getOutput$().subscribe({
      next: (output) => blockingError.next(output.error),
      error: (error) => blockingError.next(error),
    })
  );

  const uuid = embeddable.id;
  const parentApi = embeddable.parent;

  /**
   * We treat all legacy embeddable types as if they can support local unified search state, because there is no programmatic way
   * to tell when given a legacy embeddable what it's input could contain. All existing actions treat these as optional
   * so if the Embeddable is incapable of publishing unified search state (i.e. markdown) then it will just be ignored.
   */
  const localTimeRange = inputKeyToSubject<TimeRange | undefined>('timeRange', true);
  const setLocalTimeRange = (timeRange?: TimeRange) => embeddable.updateInput({ timeRange });
  const getFallbackTimeRange = () =>
    (embeddable.parent?.getInput() as unknown as CommonLegacyInput)?.timeRange;

  const localFilters: BehaviorSubject<Filter[] | undefined> = new BehaviorSubject<
    Filter[] | undefined
  >(undefined);
  const localQuery: BehaviorSubject<Query | AggregateQuery | undefined> = new BehaviorSubject<
    Query | AggregateQuery | undefined
  >(undefined);
  // if this embeddable is a legacy filterable embeddable, publish changes to those filters to the panelFilters subject.
  if (isFilterableEmbeddable(embeddable)) {
    embeddable.untilInitializationFinished().then(() => {
      localFilters.next(embeddable.getFilters());
      localQuery.next(embeddable.getQuery());

      subscriptions.add(
        embeddable.getInput$().subscribe(() => {
          if (!compareFilters(embeddable.localFilters.getValue() ?? [], embeddable.getFilters())) {
            localFilters.next(embeddable.getFilters());
          }
          if (!deepEqual(embeddable.localQuery.getValue() ?? [], embeddable.getQuery())) {
            localQuery.next(embeddable.getQuery());
          }
        })
      );
    });
  }

  const dataViews = outputKeyToSubject<DataView[]>('indexPatterns');
  const isCompatibleWithLocalUnifiedSearch = () => {
    const isInputControl =
      isVisualizeEmbeddable(embeddable) &&
      (embeddable as unknown as VisualizeEmbeddable).getOutput().visTypeName ===
        'input_control_vis';

    const isMarkdown =
      isVisualizeEmbeddable(embeddable) &&
      (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'markdown';

    const isImage = embeddable.type === 'image';
    const isLinks = embeddable.type === 'links';
    return !isInputControl && !isMarkdown && !isImage && !isLinks;
  };

  return {
    api: {
      parentApi: parentApi as LegacyEmbeddableAPI['parentApi'],
      uuid,
      viewMode,
      dataLoading,
      blockingError,

      onEdit,
      isEditingEnabled,
      getTypeDisplayName,

      localTimeRange,
      setLocalTimeRange,
      localFilters,
      localQuery,
      getFallbackTimeRange,
      isCompatibleWithLocalUnifiedSearch,

      dataViews,
      disabledActionIds,

      panelTitle,
      setPanelTitle,
      defaultPanelTitle,

      hidePanelTitle,
      setHidePanelTitle,

      setPanelDescription,
      panelDescription,

      canLinkToLibrary: () => canLinkLegacyEmbeddable(embeddable),
      linkToLibrary: () => linkLegacyEmbeddable(embeddable),

      canUnlinkFromLibrary: () => canUnlinkLegacyEmbeddable(embeddable),
      unlinkFromLibrary: () => unlinkLegacyEmbeddable(embeddable),
    },
    destroyAPI: () => {
      subscriptions.unsubscribe();
    },
  };
};
