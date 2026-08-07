/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UnifiedHistogramSuggestionType } from '@kbn/discover-utils';
import type { DiscoverSessionApiTab } from '../schema';
import { transformVisContextIn, transformVisContextOut } from './transform_vis_context';

describe('vis context transforms', () => {
  const transformOut = (visContext: Parameters<typeof transformVisContextOut>[0]) =>
    transformVisContextOut(visContext, 'tab-1');

  describe('transformVisContextOut', () => {
    it('maps stored visContext to API vis_context and omits requestData', () => {
      const result = transformOut({
        suggestionType: UnifiedHistogramSuggestionType.histogramForDataView,
        requestData: {
          dataViewId: 'logs-dv',
          timeInterval: '1h',
        },
        attributes: {
          visualizationType: 'lnsXY',
          state: { foo: 'bar' },
        },
      });

      expect(result).toEqual({
        visContext: {
          suggestion_type: UnifiedHistogramSuggestionType.histogramForDataView,
          attributes: {
            visualizationType: 'lnsXY',
            state: { foo: 'bar' },
          },
        },
        warnings: [],
      });
    });

    it('returns no warnings for cleared stored vis context', () => {
      expect(transformOut({})).toEqual({
        visContext: undefined,
        warnings: [],
      });
      expect(transformOut(undefined)).toEqual({
        visContext: undefined,
        warnings: [],
      });
    });

    it('drops invalid stored vis context and reports a warning', () => {
      const invalidValues = [
        {
          suggestionType: 'unsupported',
          requestData: {},
          attributes: {},
        },
        'invalid',
      ] as unknown as Array<Parameters<typeof transformVisContextOut>[0]>;

      for (const value of invalidValues) {
        const result = transformOut(value);

        expect(result.visContext).toBeUndefined();
        expect(result.warnings).toEqual([
          expect.objectContaining({
            type: 'dropped_property',
            tab_id: 'tab-1',
            key: 'vis_context',
          }),
        ]);
      }
    });
  });

  describe('round-trip', () => {
    const requestData = {
      dataViewId: 'logs-dv',
      timeField: '@timestamp',
      timeInterval: 'auto',
      breakdownField: 'host.name',
    };
    const apiVisContext: NonNullable<DiscoverSessionApiTab['vis_context']> = {
      suggestion_type: UnifiedHistogramSuggestionType.histogramForESQL,
      attributes: {
        visualizationType: 'lnsXY',
        state: { foo: 'bar' },
      },
    };

    it('round-trips API vis_context when requestData is supplied on transform in', () => {
      const stored = transformVisContextIn(apiVisContext, requestData);

      expect(transformOut(stored)).toEqual({
        visContext: apiVisContext,
        warnings: [],
      });
      expect(stored).toEqual({
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
        requestData,
        attributes: apiVisContext.attributes,
      });
    });
  });

  describe('transformVisContextIn', () => {
    it('maps API vis_context to stored visContext with requestData', () => {
      const result = transformVisContextIn(
        {
          suggestion_type: UnifiedHistogramSuggestionType.histogramForESQL,
          attributes: {
            visualizationType: 'lnsXY',
            state: { foo: 'bar' },
          },
        },
        {
          dataViewId: 'logs-dv',
          timeField: '@timestamp',
          timeInterval: 'auto',
          breakdownField: 'host.name',
        }
      );

      expect(result).toEqual({
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
        requestData: {
          dataViewId: 'logs-dv',
          timeField: '@timestamp',
          timeInterval: 'auto',
          breakdownField: 'host.name',
        },
        attributes: {
          visualizationType: 'lnsXY',
          state: { foo: 'bar' },
        },
      });
    });

    it('returns undefined when API vis_context is missing', () => {
      expect(transformVisContextIn(undefined)).toBeUndefined();
    });
  });
});
