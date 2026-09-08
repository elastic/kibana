/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import type { DiscoverSessionApiTab } from '../../server';
import { fromApiVisContext } from './vis_context';

type ApiVisContext = NonNullable<DiscoverSessionApiTab['vis_context']>;

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

    expect(fromApiVisContext(visContext, 'host.name')).toStrictEqual({
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

    expect(fromApiVisContext(visContext, breakdownField)).toStrictEqual({
      suggestionType: visContext.suggestion_type,
      attributes: visContext.attributes,
      requestData: { dataViewId: 'esql-dv', timeField: '@timestamp' },
    });
  });

  it('keeps the client fallback empty even with a breakdown', () => {
    const visContext: ApiVisContext = {
      suggestion_type: UnifiedHistogramSuggestionType.histogramForESQL,
      attributes: { visualizationType: 'lnsXY', state: { foo: 'bar' } },
    };

    expect(fromApiVisContext(visContext, 'host.name')).toStrictEqual({
      suggestionType: visContext.suggestion_type,
      attributes: visContext.attributes,
      requestData: {},
    });
  });

  it('returns undefined when the tab has no chart', () => {
    expect(fromApiVisContext(undefined, 'host.name')).toBeUndefined();
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
