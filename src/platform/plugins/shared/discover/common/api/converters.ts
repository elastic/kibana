/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type {
  DiscoverSessionApiTab,
  DiscoverSessionControlPanels,
  DiscoverSessionWarning,
} from '../../server/api/schema';
import { fromStoredTab } from '../embeddable/transform_utils';
import { DISCOVER_SESSION_CHART_INTERVALS, type DiscoverSessionChartInterval } from './constants';

interface StoredDiscoverSessionTab {
  id: string;
  label: string;
  attributes: DiscoverSessionTabAttributes;
}

type ApiVisContext = DiscoverSessionApiTab['vis_context'];
type ApiSuggestionType = NonNullable<ApiVisContext>['suggestion_type'];

const isApiSuggestionType = (value: unknown): value is ApiSuggestionType =>
  value === UnifiedHistogramSuggestionType.lensSuggestion ||
  value === UnifiedHistogramSuggestionType.histogramForESQL ||
  value === UnifiedHistogramSuggestionType.histogramForDataView;

const isDiscoverSessionChartInterval = (value: string): value is DiscoverSessionChartInterval =>
  DISCOVER_SESSION_CHART_INTERVALS.some((interval) => interval === value);

const createDroppedChartIntervalWarning = (
  tabId: string,
  chartInterval: string
): DiscoverSessionWarning => ({
  type: 'dropped_property',
  tab_id: tabId,
  key: 'chart_interval',
  message: `Chart interval [${chartInterval}] in tab [${tabId}] is not supported and was omitted.`,
});

export const getDiscoverSessionVisContext = (
  visContext: DiscoverSessionTabAttributes['visContext']
): ApiVisContext | undefined => {
  if (
    !visContext ||
    !('suggestionType' in visContext) ||
    !('attributes' in visContext) ||
    !visContext.suggestionType ||
    !visContext.attributes
  ) {
    return undefined;
  }

  if (!isApiSuggestionType(visContext.suggestionType)) {
    return undefined;
  }

  return {
    suggestion_type: visContext.suggestionType,
    attributes: visContext.attributes,
  };
};

export const getDiscoverSessionTab = ({
  tab,
  references = [],
  controlPanels,
}: {
  tab: StoredDiscoverSessionTab;
  references?: SavedObjectReference[];
  controlPanels?: DiscoverSessionControlPanels;
}): { apiTab: DiscoverSessionApiTab; warnings: DiscoverSessionWarning[] } => {
  const baseApiTab = fromStoredTab(tab.attributes, references);
  const visContext = getDiscoverSessionVisContext(tab.attributes.visContext);
  const { chartInterval } = tab.attributes;
  const validChartInterval =
    chartInterval !== undefined && isDiscoverSessionChartInterval(chartInterval)
      ? chartInterval
      : undefined;
  const warnings =
    chartInterval !== undefined && validChartInterval === undefined
      ? [createDroppedChartIntervalWarning(tab.id, chartInterval)]
      : [];

  const apiTab: DiscoverSessionApiTab = {
    id: tab.id,
    label: tab.label,
    ...baseApiTab,
    hide_chart: tab.attributes.hideChart ?? false,
    hide_table: tab.attributes.hideTable ?? false,
    ...(tab.attributes.hideAggregatedPreview !== undefined && {
      hide_aggregated_preview: tab.attributes.hideAggregatedPreview,
    }),
    ...(tab.attributes.breakdownField !== undefined && {
      breakdown_field: tab.attributes.breakdownField,
    }),
    ...(validChartInterval !== undefined && { chart_interval: validChartInterval }),
    time_restore: tab.attributes.timeRestore ?? false,
    ...(tab.attributes.timeRange !== undefined && { time_range: tab.attributes.timeRange }),
    ...(tab.attributes.refreshInterval !== undefined && {
      refresh_interval: tab.attributes.refreshInterval,
    }),
    ...(visContext !== undefined && { vis_context: visContext }),
    ...(controlPanels !== undefined && { control_panels: controlPanels }),
    ...(tab.attributes.isTextBasedQuery &&
      tab.attributes.esqlApproximation !== undefined && {
        esql_approximation: tab.attributes.esqlApproximation,
      }),
  };

  return { apiTab, warnings };
};
