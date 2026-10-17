/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { UnifiedHistogramSuggestionType } from '../../types';
import { stripHistogramOverlay } from '../../utils/lens_vis_from_table';
import {
  applyHistogramOverlayAttributes,
  useHistogramOverlayAttributes,
  type UnifiedHistogramOverlaySeries,
} from './histogram_overlay';

const sourceQuery = 'FROM logs | STATS results = COUNT(*) BY timestamp = BUCKET(timestamp, 1 hour)';

const attributes = {
  title: 'Histogram',
  visualizationType: 'lnsXY',
  references: [],
  state: {
    datasourceStates: {
      textBased: {
        layers: {
          layer1: {
            columns: [
              { columnId: 'timestamp', fieldName: 'timestamp', meta: { type: 'date' } },
              {
                columnId: 'results',
                fieldName: 'results',
                meta: { type: 'number' },
                inMetricDimension: true,
              },
            ],
            query: { esql: sourceQuery },
          },
        },
      },
    },
    visualization: {
      layers: [
        {
          layerId: 'layer1',
          seriesType: 'bar_stacked',
          accessors: ['results'],
        },
      ],
    },
    query: { query: '', language: 'kuery' },
    filters: [],
  },
} as unknown as LensAttributes;

const overlaySeries: UnifiedHistogramOverlaySeries = {
  key: 'row|query|from|to',
  label: 'Selected pattern',
  values: [1, 2],
  timeField: 'timestamp',
  from: '2020-01-01T00:00:00.000Z',
  to: '2020-01-01T02:00:00.000Z',
  sourceQuery,
  sourceTimeRange: { from: '2020-01-01T00:00:00.000Z', to: '2020-01-01T02:00:00.000Z' },
  isSampled: false,
};

const colors = {
  remainder: '#vis0',
  overlay: '#vis8',
  remainderLabel: 'Other documents',
};

const fetchParams = {
  query: { esql: sourceQuery },
  timeRange: overlaySeries.sourceTimeRange,
  dataView: { timeFieldName: 'timestamp' },
} as Parameters<typeof useHistogramOverlayAttributes>[0]['fetchParams'];

describe('histogram overlay attributes', () => {
  it('plots remainder and overlay while keeping the total column', () => {
    const derived = applyHistogramOverlayAttributes(attributes, overlaySeries, colors);
    const layer = derived.state.datasourceStates.textBased?.layers.layer1;
    const visualization = derived.state.visualization as {
      layers: Array<{
        accessors: string[];
        yConfig: Array<{ forAccessor: string; color: string }>;
      }>;
    };

    expect(layer?.columns.map((column) => column.columnId)).toEqual([
      'timestamp',
      'results',
      'remainder',
      'overlay',
    ]);
    expect(visualization.layers[0].accessors).toEqual(['remainder', 'overlay']);
    expect(visualization.layers[0].yConfig).toEqual([
      { forAccessor: 'remainder', color: '#vis0' },
      { forAccessor: 'overlay', color: '#vis8' },
    ]);
    expect(attributes.state.visualization).toEqual({
      layers: [{ layerId: 'layer1', seriesType: 'bar_stacked', accessors: ['results'] }],
    });
  });

  it('strips overlay metadata from attributes used for save and edit', () => {
    const derived = applyHistogramOverlayAttributes(attributes, overlaySeries, colors);
    const visualization = derived.state.visualization as {
      layers: Array<{ yConfig?: Array<{ forAccessor: string; color?: string }> }>;
    };
    visualization.layers[0].yConfig = [
      ...(visualization.layers[0].yConfig ?? []),
      { forAccessor: 'results', color: '#keep' },
    ];
    const stripped = stripHistogramOverlay(derived);
    const strippedLayer = stripped.state.datasourceStates.textBased?.layers.layer1;
    const strippedVisualization = stripped.state.visualization as {
      layers: Array<{
        layerId: string;
        seriesType: string;
        accessors: string[];
        yConfig?: Array<{ forAccessor: string; color?: string }>;
      }>;
    };

    expect(strippedLayer?.histogramOverlay).toBeUndefined();
    expect(strippedLayer?.columns).toEqual(
      attributes.state.datasourceStates.textBased?.layers.layer1.columns
    );
    expect(strippedVisualization.layers[0]).toEqual({
      layerId: 'layer1',
      seriesType: 'bar_stacked',
      accessors: ['results'],
      yConfig: [{ forAccessor: 'results', color: '#keep' }],
    });
  });

  it('keeps a stable derived identity while the overlay is unchanged', () => {
    const { result, rerender } = renderHook(
      (series: UnifiedHistogramOverlaySeries | undefined) =>
        useHistogramOverlayAttributes({
          attributes,
          suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
          fetchParams,
          overlaySeries: series,
          remainderColor: colors.remainder,
          overlayColor: colors.overlay,
          remainderLabel: colors.remainderLabel,
        }),
      { initialProps: overlaySeries }
    );
    const first = result.current;

    rerender(overlaySeries);

    expect(result.current).toBe(first);
    expect(first).toBeDefined();
  });

  it('leaves the chart unchanged when a generated column id already exists', () => {
    const colliding = structuredClone(attributes);
    const dateColumn = colliding.state.datasourceStates.textBased?.layers.layer1.columns[0];

    if (dateColumn) {
      dateColumn.columnId = 'overlay';
      dateColumn.fieldName = 'overlay';
    }

    expect(applyHistogramOverlayAttributes(colliding, overlaySeries, colors)).toBe(colliding);

    const { result } = renderHook(() =>
      useHistogramOverlayAttributes({
        attributes: colliding,
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
        fetchParams,
        overlaySeries,
        remainderColor: colors.remainder,
        overlayColor: colors.overlay,
        remainderLabel: colors.remainderLabel,
      })
    );

    expect(result.current).toBeUndefined();
  });

  it('leaves the chart unchanged when the overlay does not match', () => {
    const { result } = renderHook(() =>
      useHistogramOverlayAttributes({
        attributes,
        suggestionType: UnifiedHistogramSuggestionType.histogramForESQL,
        fetchParams: {
          ...fetchParams,
          breakdown: 'host' as unknown as typeof fetchParams.breakdown,
        },
        overlaySeries,
        remainderColor: colors.remainder,
        overlayColor: colors.overlay,
        remainderLabel: colors.remainderLabel,
      })
    );

    expect(result.current).toBeUndefined();
  });
});
