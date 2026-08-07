/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL } from '@kbn/controls-constants';
import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import type { DiscoverSessionTab as StoredDiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { DiscoverSessionApiData, DiscoverSessionApiTab } from '../../../../../../server';
import { fromStoredTab } from '../../../../../../common/embeddable/transform_utils';
import type { DiscoverServices } from '../../../../../build_services';
import {
  fromTabStateToSavedObjectTab,
  selectAllTabs,
  selectTab,
  selectTabRuntimeState,
  type DiscoverInternalState,
  type RuntimeStateManager,
  type TabState,
} from '../../../state_management/redux';

const getVisContext = (
  visContext: StoredDiscoverSessionTab['visContext']
): DiscoverSessionApiTab['vis_context'] => {
  if (
    !visContext ||
    !('suggestionType' in visContext) ||
    !('attributes' in visContext) ||
    !visContext.suggestionType ||
    !visContext.attributes
  ) {
    return undefined;
  }

  switch (visContext.suggestionType) {
    case UnifiedHistogramSuggestionType.lensSuggestion:
    case UnifiedHistogramSuggestionType.histogramForESQL:
    case UnifiedHistogramSuggestionType.histogramForDataView:
      return {
        suggestion_type: visContext.suggestionType,
        attributes: visContext.attributes,
      };
    default:
      return undefined;
  }
};

const getControlPanels = (
  controlGroupState: TabState['attributes']['controlGroupState']
): DiscoverSessionApiTab['control_panels'] => {
  if (!controlGroupState) {
    return undefined;
  }

  const controlPanels = Object.entries(controlGroupState)
    .sort(([, firstPanel], [, secondPanel]) => firstPanel.order - secondPanel.order)
    .map(([id, panel]): NonNullable<DiscoverSessionApiTab['control_panels']>[number] => {
      const { order, width, grow, type, ...config } = panel;

      if (type !== ESQL_CONTROL && type !== 'esqlControl') {
        throw new Error(`Unsupported Discover control type: ${type}`);
      }

      return {
        id,
        type: ESQL_CONTROL,
        width,
        grow,
        config,
      };
    });

  return controlPanels.length ? controlPanels : undefined;
};

const getApiTab = (
  tab: StoredDiscoverSessionTab,
  controlGroupState: TabState['attributes']['controlGroupState']
): DiscoverSessionApiTab => {
  const { id, label, serializedSearchSource, ...storedAttributes } = tab;
  const attributes: DiscoverSessionTabAttributes = {
    ...storedAttributes,
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(serializedSearchSource),
    },
  };
  const apiTab = fromStoredTab(attributes);
  const visContext = getVisContext(tab.visContext);
  const controlPanels = getControlPanels(controlGroupState);

  return {
    id,
    label,
    ...apiTab,
    hide_chart: tab.hideChart,
    hide_table: tab.hideTable,
    ...(tab.hideAggregatedPreview !== undefined && {
      hide_aggregated_preview: tab.hideAggregatedPreview,
    }),
    ...(tab.breakdownField !== undefined && { breakdown_field: tab.breakdownField }),
    ...(tab.chartInterval !== undefined && {
      chart_interval: tab.chartInterval as Exclude<
        DiscoverSessionApiTab['chart_interval'],
        undefined
      >,
    }),
    time_restore: tab.timeRestore ?? false,
    ...(tab.timeRange !== undefined && { time_range: tab.timeRange }),
    ...(tab.refreshInterval !== undefined && { refresh_interval: tab.refreshInterval }),
    ...(visContext !== undefined && { vis_context: visContext }),
    ...(controlPanels !== undefined && { control_panels: controlPanels }),
  };
};

export const getDiscoverSessionExportJson = ({
  getState,
  runtimeStateManager,
  services,
  tabId,
  title,
}: {
  getState: () => DiscoverInternalState;
  runtimeStateManager: RuntimeStateManager;
  services: DiscoverServices;
  tabId?: string;
  title: string;
}): DiscoverSessionApiData => {
  const state = getState();
  const tabs = tabId ? [selectTab(state, tabId)] : selectAllTabs(state);

  return {
    title,
    description: state.persistedDiscoverSession?.description ?? '',
    tags: state.persistedDiscoverSession?.tags,
    tabs: tabs.map((tab) => {
      const currentDataView = selectTabRuntimeState(
        runtimeStateManager,
        tab.id
      )?.currentDataView$.getValue();

      const storedTab = fromTabStateToSavedObjectTab({
        tab,
        currentDataView,
        services,
      });

      if (tab.overriddenVisContextAfterInvalidation) {
        storedTab.visContext = tab.overriddenVisContextAfterInvalidation;
      }

      return getApiTab(storedTab, tab.attributes.controlGroupState);
    }),
  };
};
