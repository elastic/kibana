/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { Suggestion } from '@kbn/lens-plugin/public';
import {
  canImportVisContext,
  exportVisContext,
  isSuggestionShapeAndVisContextCompatible,
  injectESQLQueryIntoLensLayers,
} from './external_vis_context';
import { getLensVisMock } from '../__mocks__/lens_vis';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { tableMock, tableQueryMock } from '../__mocks__/table';
import { UnifiedHistogramSuggestionType, UnifiedHistogramVisContext } from '../types';

describe('external_vis_context', () => {
  const dataView: DataView = dataViewWithTimefieldMock;
  let exportedVisContext: UnifiedHistogramVisContext | undefined;

  describe('exportVisContext', () => {
    it('should work correctly', async () => {
      const lensVis = await getLensVisMock({
        filters: [],
        query: tableQueryMock,
        dataView,
        timeInterval: 'auto',
        breakdownField: undefined,
        columns: [],
        isPlainRecord: true,
        table: tableMock,
      });

      const visContext = lensVis.visContext;

      expect(visContext).toMatchSnapshot();

      exportedVisContext = exportVisContext(visContext);
      expect(exportedVisContext).toMatchSnapshot();
    });
  });

  describe('canImportVisContext', () => {
    it('should work correctly for valid input', async () => {
      expect(canImportVisContext(exportedVisContext)).toBe(true);
    });

    it('should work correctly for invalid input', async () => {
      expect(canImportVisContext(undefined)).toBe(false);
      expect(canImportVisContext({ attributes: {} })).toBe(false);
    });
  });

  describe('isSuggestionAndVisContextCompatible', () => {
    it('should work correctly', async () => {
      expect(isSuggestionShapeAndVisContextCompatible(undefined, undefined)).toBe(true);

      expect(
        isSuggestionShapeAndVisContextCompatible(
          { visualizationId: 'lnsPie', visualizationState: { shape: 'donut' } } as Suggestion,
          {
            suggestionType: UnifiedHistogramSuggestionType.lensSuggestion,
            attributes: {
              visualizationType: 'lnsPie',
              state: { visualization: { shape: 'donut' } },
            },
          } as UnifiedHistogramVisContext
        )
      ).toBe(true);

      expect(
        isSuggestionShapeAndVisContextCompatible(
          { visualizationId: 'lnsPie', visualizationState: { shape: 'donut' } } as Suggestion,
          {
            suggestionType: UnifiedHistogramSuggestionType.lensSuggestion,
            attributes: {
              visualizationType: 'lnsPie',
              state: { visualization: { shape: 'waffle' } },
            },
          } as UnifiedHistogramVisContext
        )
      ).toBe(false);

      expect(
        isSuggestionShapeAndVisContextCompatible(
          { visualizationId: 'lnsPie', visualizationState: { shape: 'donut' } } as Suggestion,
          {
            suggestionType: UnifiedHistogramSuggestionType.lensSuggestion,
            attributes: {
              visualizationType: 'lnsXY',
            },
          } as UnifiedHistogramVisContext
        )
      ).toBe(false);

      expect(
        isSuggestionShapeAndVisContextCompatible(
          {
            visualizationId: 'lnsXY',
            visualizationState: { preferredSeriesType: 'bar_stacked' },
          } as Suggestion,
          {
            attributes: {
              visualizationType: 'lnsXY',
              state: { visualization: { preferredSeriesType: 'bar_stacked' } },
            },
          } as UnifiedHistogramVisContext
        )
      ).toBe(true);

      expect(
        isSuggestionShapeAndVisContextCompatible(
          {
            visualizationId: 'lnsXY',
            visualizationState: { preferredSeriesType: 'bar_stacked' },
          } as Suggestion,
          {
            suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
            attributes: {
              visualizationType: 'lnsXY',
              state: { visualization: { preferredSeriesType: 'line' } },
            },
          } as UnifiedHistogramVisContext
        )
      ).toBe(true);

      expect(
        isSuggestionShapeAndVisContextCompatible(
          {
            visualizationId: 'lnsXY',
            visualizationState: { preferredSeriesType: 'bar_stacked' },
          } as Suggestion,
          {
            suggestionType: UnifiedHistogramSuggestionType.lensSuggestion,
            attributes: {
              visualizationType: 'lnsXY',
              state: { visualization: { preferredSeriesType: 'line' } },
            },
          } as UnifiedHistogramVisContext
        )
      ).toBe(false);

      expect(
        isSuggestionShapeAndVisContextCompatible(
          {
            visualizationId: 'lnsXY',
            visualizationState: { preferredSeriesType: 'bar_stacked' },
          } as Suggestion,
          {
            suggestionType: UnifiedHistogramSuggestionType.histogramForDataView,
            attributes: {
              visualizationType: 'lnsXY',
              state: { visualization: { preferredSeriesType: 'bar_stacked' } },
            },
          } as UnifiedHistogramVisContext
        )
      ).toBe(true);
    });
  });

  describe('injectESQLQueryIntoLensLayers', () => {
    it('should return the Lens attributes as they are for unknown datasourceId', async () => {
      const attributes = {
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: { unknownId: { layers: {} } },
        },
      } as unknown as UnifiedHistogramVisContext['attributes'];
      expect(injectESQLQueryIntoLensLayers(attributes, { esql: 'from foo' })).toStrictEqual(
        attributes
      );
    });

    it('should return the Lens attributes as they are for DSL config (formbased)', async () => {
      const attributes = {
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: { formBased: { layers: {} } },
        },
      } as UnifiedHistogramVisContext['attributes'];
      expect(injectESQLQueryIntoLensLayers(attributes, { esql: 'from foo' })).toStrictEqual(
        attributes
      );
    });

    it('should inject the query to the Lens attributes for ES|QL config (textbased)', async () => {
      const attributes = {
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: { textBased: { layers: { layer1: { query: { esql: 'from foo' } } } } },
        },
      } as unknown as UnifiedHistogramVisContext['attributes'];

      const expectedAttributes = {
        ...attributes,
        state: {
          ...attributes.state,
          datasourceStates: {
            ...attributes.state.datasourceStates,
            textBased: {
              ...attributes.state.datasourceStates.textBased,
              layers: {
                layer1: {
                  query: { esql: 'from foo | stats count(*)' },
                },
              },
            },
          },
        },
      } as unknown as UnifiedHistogramVisContext['attributes'];
      expect(
        injectESQLQueryIntoLensLayers(attributes, { esql: 'from foo | stats count(*)' })
      ).toStrictEqual(expectedAttributes);
    });

    it('should inject the interval to the Lens attributes for ES|QL config (textbased)', async () => {
      const attributes = {
        visualizationType: 'lnsXY',
        state: {
          visualization: { preferredSeriesType: 'line' },
          datasourceStates: {
            textBased: {
              layers: {
                layer1: {
                  query: { esql: 'from foo' },
                  columns: [
                    {
                      columnId: 'col1',
                      fieldName: 'field1',
                    },
                    {
                      columnId: 'timestamp',
                      fieldName: 'timestamp',
                      label: 'timestamp every 1h',
                      customLabel: true,
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as UnifiedHistogramVisContext['attributes'];

      const expectedAttributes = {
        ...attributes,
        state: {
          ...attributes.state,
          datasourceStates: {
            ...attributes.state.datasourceStates,
            textBased: {
              ...attributes.state.datasourceStates.textBased,
              layers: {
                layer1: {
                  query: { esql: 'from foo' },
                  columns: [
                    {
                      columnId: 'col1',
                      fieldName: 'field1',
                    },
                    {
                      columnId: 'timestamp',
                      fieldName: 'timestamp',
                      label: 'timestamp every 10 minutes',
                      customLabel: true,
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as UnifiedHistogramVisContext['attributes'];
      expect(
        injectESQLQueryIntoLensLayers(
          attributes,
          { esql: 'from foo' },
          'timestamp every 10 minutes'
        )
      ).toStrictEqual(expectedAttributes);
    });
  });
});
