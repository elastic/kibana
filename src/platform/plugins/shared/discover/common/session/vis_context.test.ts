/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionApiTab } from '../../server';
import { fromApiVisContext } from './vis_context';

type ApiVisContext = NonNullable<DiscoverSessionApiTab['vis_context']>;

const esqlTab: DiscoverSessionApiTab = {
  id: 'esql-tab',
  label: 'ES|QL',
  data_source: { type: 'esql', query: 'FROM logs-*' },
  sort: [],
  hide_chart: false,
  hide_table: false,
};

describe('fromApiVisContext', () => {
  it.each([
    UnifiedHistogramSuggestionType.histogramForESQL,
    UnifiedHistogramSuggestionType.lensSuggestion,
  ] as const)('assembles %s with the extracted fingerprint and breakdown', (suggestionType) => {
    const visContext = createVisContext({
      suggestionType,
      layers: { 'layer-1': { index: 'esql-dv' } },
      dataViews: { 'esql-dv': { type: 'esql', timeFieldName: '@timestamp' } },
    });

    expect(
      fromApiVisContext({ ...esqlTab, vis_context: visContext, breakdown_field: 'host.name' })
    ).toStrictEqual({
      suggestionType,
      attributes: visContext.attributes,
      requestData: {
        dataViewId: 'esql-dv',
        timeField: '@timestamp',
        breakdownField: 'host.name',
      },
    });
  });

  it.each([undefined, ''])('omits an absent or empty breakdown (%s)', (breakdownField) => {
    const visContext = createVisContext({
      layers: { 'layer-1': { index: 'esql-dv' } },
      dataViews: { 'esql-dv': { type: 'esql', timeFieldName: '@timestamp' } },
    });

    expect(
      fromApiVisContext({ ...esqlTab, vis_context: visContext, breakdown_field: breakdownField })
    ).toStrictEqual({
      suggestionType: visContext.suggestion_type,
      attributes: visContext.attributes,
      requestData: { dataViewId: 'esql-dv', timeField: '@timestamp' },
    });
  });

  it('uses the tab breakdown without adding a classic interval to an ES|QL fallback', () => {
    const visContext: ApiVisContext = {
      suggestion_type: UnifiedHistogramSuggestionType.histogramForESQL,
      attributes: { visualizationType: 'lnsXY', state: { foo: 'bar' } },
    };

    expect(
      fromApiVisContext({
        ...esqlTab,
        vis_context: visContext,
        breakdown_field: 'host.name',
        chart_interval: 'h',
      })
    ).toStrictEqual({
      suggestionType: visContext.suggestion_type,
      attributes: visContext.attributes,
      requestData: { breakdownField: 'host.name' },
    });
  });

  it('uses the inline time field and classic interval without inventing a data view ID', () => {
    const visContext: ApiVisContext = {
      suggestion_type: UnifiedHistogramSuggestionType.histogramForDataView,
      attributes: { visualizationType: 'lnsXY' },
    };

    expect(
      fromApiVisContext({
        id: 'inline-tab',
        label: 'Inline',
        data_source: {
          type: 'data_view_spec',
          index_pattern: 'logs-*',
          time_field: '@timestamp',
        },
        filters: [],
        sort: [],
        view_mode: VIEW_MODE.DOCUMENT_LEVEL,
        hide_chart: false,
        hide_table: false,
        chart_interval: 'h',
        vis_context: visContext,
      })
    ).toStrictEqual({
      suggestionType: visContext.suggestion_type,
      attributes: visContext.attributes,
      requestData: { timeField: '@timestamp', timeInterval: 'h' },
    });
  });

  it('returns undefined when the tab has no chart', () => {
    expect(fromApiVisContext({ ...esqlTab, breakdown_field: 'host.name' })).toBeUndefined();
  });
});

const createVisContext = ({
  layers,
  dataViews,
  suggestionType = UnifiedHistogramSuggestionType.histogramForESQL,
}: {
  layers: Record<string, { index: string }>;
  dataViews: Record<string, { type: string; timeFieldName?: string }>;
  suggestionType?: ApiVisContext['suggestion_type'];
}): ApiVisContext => ({
  suggestion_type: suggestionType,
  attributes: {
    visualizationType: 'lnsXY',
    state: {
      datasourceStates: { textBased: { layers } },
      adHocDataViews: dataViews,
    },
  },
});
