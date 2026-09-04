/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Position } from '@elastic/charts';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import { EXTENDED_REFERENCE_LINE_DECORATION_CONFIG, LayerTypes, REFERENCE_LINE } from './constants';
import type {
  CommonXYDataLayerConfig,
  CommonXYLayerConfig,
  ReferenceLineConfig,
  ReferenceLineLayerConfig,
  YAxisConfig,
} from './types';
import { applyAxisFormatPolicies, resolveAxisFormatPolicies } from './axis_format_policy';

const duration = (
  inputFormat: string,
  outputFormat: string,
  extraParams: Record<string, unknown> = {}
): SerializedFieldFormat => ({
  id: 'duration',
  params: { inputFormat, outputFormat, outputPrecision: 2, ...extraParams },
});

const column = (id: string, format: SerializedFieldFormat): DatatableColumn => ({
  id,
  name: id,
  meta: { type: 'number', params: format },
});

const table = (columns: DatatableColumn[], row: Record<string, number>): Datatable => ({
  type: 'datatable',
  columns,
  rows: [row],
});

const dataLayer = ({
  layerId,
  columns,
  row,
  accessors,
  isPercentage = false,
  decorations,
}: {
  layerId: string;
  columns: DatatableColumn[];
  row: Record<string, number>;
  accessors: Array<string | ExpressionValueVisDimension>;
  isPercentage?: boolean;
  decorations?: Array<{ forAccessor: string; axisId?: string }>;
}): CommonXYDataLayerConfig =>
  ({
    layerId,
    type: 'extendedDataLayer',
    layerType: LayerTypes.DATA,
    accessors,
    table: table(columns, row),
    decorations,
    seriesType: 'line',
    xScaleType: 'linear',
    isHistogram: false,
    isPercentage,
    isStacked: false,
    isHorizontal: false,
    palette: { type: 'palette', name: 'default', params: {} },
  } as unknown as CommonXYDataLayerConfig);

const referenceLayer = (
  accessor: string,
  format: SerializedFieldFormat,
  value: number,
  position = Position.Left
): ReferenceLineLayerConfig =>
  ({
    layerId: 'reference',
    type: 'referenceLineLayer',
    layerType: LayerTypes.REFERENCELINE,
    accessors: [accessor],
    table: table([column(accessor, format)], { [accessor]: value }),
    decorations: [{ type: 'referenceLineDecorationConfig', forAccessor: accessor, position }],
  } as ReferenceLineLayerConfig);

const standaloneReferenceLine = (
  accessor: string,
  format: SerializedFieldFormat,
  value: number,
  position = Position.Left
): ReferenceLineConfig => ({
  layerId: 'reference-line',
  type: REFERENCE_LINE,
  layerType: LayerTypes.REFERENCELINE,
  lineLength: 1,
  decorations: [
    {
      type: EXTENDED_REFERENCE_LINE_DECORATION_CONFIG,
      forAccessor: accessor,
      value,
      fill: 'none',
      position,
      valueMeta: { type: 'number', params: format },
    },
  ],
});

describe('axis format policy', () => {
  it('uses the first duration output as coordinate unit and converts every duration member', () => {
    const layers = [
      dataLayer({
        layerId: 'first',
        columns: [
          column('milliseconds', duration('milliseconds', 'asSeconds')),
          column('minutes', duration('minutes', 'asHours')),
        ],
        row: { milliseconds: 1000, minutes: 60 },
        accessors: ['milliseconds', 'minutes'],
      }),
    ];

    const [policy] = resolveAxisFormatPolicies(layers);

    expect(policy).toEqual(
      expect.objectContaining({
        groupId: 'left',
        coordinateUnit: 'seconds',
        anchor: { layerId: 'first', accessor: 'milliseconds' },
        formatter: expect.objectContaining({
          id: 'duration',
          params: expect.objectContaining({ inputFormat: 'seconds', outputFormat: 'asSeconds' }),
        }),
      })
    );
    expect(policy.members).toEqual([
      expect.objectContaining({ accessor: 'milliseconds', factor: 0.001 }),
      expect.objectContaining({ accessor: 'minutes', factor: 60 }),
    ]);
    expect(policy.mismatches).toEqual([expect.objectContaining({ accessor: 'minutes' })]);

    const normalized = applyAxisFormatPolicies(layers, [policy]);
    expect(normalized).not.toBe(layers);
    expect(normalized[0]).not.toBe(layers[0]);
    expect((normalized[0] as CommonXYDataLayerConfig).table.rows[0]).toEqual({
      milliseconds: 1,
      minutes: 3600,
    });
    expect(layers[0].table.rows[0]).toEqual({ milliseconds: 1000, minutes: 60 });
  });

  it('uses seconds as the coordinate unit for human-readable duration output', () => {
    const layer = dataLayer({
      layerId: 'first',
      columns: [column('duration', duration('minutes', 'humanizePrecise'))],
      row: { duration: 2 },
      accessors: ['duration'],
    });

    expect(resolveAxisFormatPolicies([layer])[0]).toEqual(
      expect.objectContaining({ coordinateUnit: 'seconds' })
    );
  });

  it('converts mixed humanizePrecise durations on the same axis into seconds for the chart', () => {
    const layers = [
      dataLayer({
        layerId: 'metrics',
        columns: [
          column('milliseconds', duration('milliseconds', 'humanizePrecise')),
          column('seconds', duration('seconds', 'humanizePrecise')),
        ],
        row: { milliseconds: 1000, seconds: 1 },
        accessors: ['milliseconds', 'seconds'],
      }),
    ];

    const [policy] = resolveAxisFormatPolicies(layers);
    const chartLayers = applyAxisFormatPolicies(layers, [policy]);

    expect(policy).toEqual(
      expect.objectContaining({
        groupId: 'left',
        coordinateUnit: 'seconds',
        formatter: expect.objectContaining({
          id: 'duration',
          params: expect.objectContaining({
            inputFormat: 'seconds',
            outputFormat: 'humanizePrecise',
          }),
        }),
      })
    );
    expect(policy.members).toEqual([
      expect.objectContaining({ accessor: 'milliseconds', factor: 0.001 }),
      expect.objectContaining({ accessor: 'seconds', factor: 1 }),
    ]);
    expect((chartLayers[0] as CommonXYDataLayerConfig).table.rows[0]).toEqual({
      milliseconds: 1,
      seconds: 1,
    });
  });

  it('does not normalize numerically when the anchor is not a duration', () => {
    const layer = dataLayer({
      layerId: 'first',
      columns: [
        column('count', { id: 'number' }),
        column('duration', duration('milliseconds', 'asSeconds')),
      ],
      row: { count: 10, duration: 1000 },
      accessors: ['count', 'duration'],
      decorations: [
        { forAccessor: 'count', axisId: 'shared' },
        { forAccessor: 'duration', axisId: 'shared' },
      ],
    });
    const axisConfigs: YAxisConfig[] = [{ id: 'shared', position: Position.Left }];

    const layers = [layer];
    const policies = resolveAxisFormatPolicies(layers, axisConfigs);
    expect(policies[0].coordinateUnit).toBeUndefined();
    expect(policies.flatMap(({ members }) => members).every(({ factor }) => factor === 1)).toBe(
      true
    );
    expect(applyAxisFormatPolicies(layers, policies)).toBe(layers);
  });

  it('does not convert a formatted follower when the first series on the axis has no format', () => {
    const unformatted: DatatableColumn = {
      id: 'raw',
      name: 'raw',
      meta: { type: 'number' },
    };
    const layers = [
      dataLayer({
        layerId: 'metrics',
        columns: [unformatted, column('milliseconds', duration('milliseconds', 'asSeconds'))],
        row: { raw: 42, milliseconds: 1000 },
        accessors: ['raw', 'milliseconds'],
        decorations: [
          { forAccessor: 'raw', axisId: 'shared' },
          { forAccessor: 'milliseconds', axisId: 'shared' },
        ],
      }),
    ];
    const axisConfigs: YAxisConfig[] = [{ id: 'shared', position: Position.Left }];
    const policies = resolveAxisFormatPolicies(layers, axisConfigs);
    const chartLayers = applyAxisFormatPolicies(layers, policies);

    expect(policies).toEqual([
      expect.objectContaining({
        groupId: 'axis-shared',
        coordinateUnit: undefined,
        formatter: { id: 'number' },
        anchor: { layerId: 'metrics', accessor: 'raw' },
      }),
    ]);
    expect(policies[0].members).toEqual([
      expect.objectContaining({ accessor: 'raw', factor: 1 }),
      expect.objectContaining({ accessor: 'milliseconds', factor: 1 }),
    ]);
    expect(chartLayers).toBe(layers);
    expect((chartLayers[0] as CommonXYDataLayerConfig).table.rows[0]).toEqual({
      raw: 42,
      milliseconds: 1000,
    });
  });

  it('treats an unformatted follower as an unchanged axis-relative value', () => {
    const axisConfigs: YAxisConfig[] = [{ id: 'shared', position: Position.Left }];
    const layer = dataLayer({
      layerId: 'first',
      columns: [
        column('duration', duration('milliseconds', 'asSeconds')),
        column('raw', { id: 'number' }),
      ],
      row: { duration: 1000, raw: 42 },
      accessors: ['duration', 'raw'],
      decorations: [
        { forAccessor: 'duration', axisId: 'shared' },
        { forAccessor: 'raw', axisId: 'shared' },
      ],
    });

    const [policy] = resolveAxisFormatPolicies([layer], axisConfigs);
    const normalized = applyAxisFormatPolicies([layer], [policy]);

    expect(policy.members).toEqual([
      expect.objectContaining({ accessor: 'duration', factor: 0.001 }),
      expect.objectContaining({ accessor: 'raw', factor: 1 }),
    ]);
    expect(policy.mismatches).toEqual([]);
    expect((normalized[0] as CommonXYDataLayerConfig).table.rows[0]).toEqual({
      duration: 1,
      raw: 42,
    });
  });

  it('treats malformed duration configuration as unformatted', () => {
    const layer = dataLayer({
      layerId: 'first',
      columns: [column('duration', duration('fortnights', 'asSeconds'))],
      row: { duration: 2 },
      accessors: ['duration'],
    });

    expect(resolveAxisFormatPolicies([layer])[0]).toEqual(
      expect.objectContaining({
        coordinateUnit: undefined,
        formatter: { id: 'number' },
      })
    );
  });

  it('resolves independent explicit axes', () => {
    const axisConfigs: YAxisConfig[] = [
      { id: 'left-id', position: Position.Left },
      { id: 'right-id', position: Position.Right },
    ];
    const layers = [
      dataLayer({
        layerId: 'left',
        columns: [column('seconds', duration('seconds', 'asSeconds'))],
        row: { seconds: 1 },
        accessors: ['seconds'],
        decorations: [{ forAccessor: 'seconds', axisId: 'left-id' }],
      }),
      dataLayer({
        layerId: 'right',
        columns: [column('minutes', duration('minutes', 'asMinutes'))],
        row: { minutes: 1 },
        accessors: ['minutes'],
        decorations: [{ forAccessor: 'minutes', axisId: 'right-id' }],
      }),
    ];

    expect(resolveAxisFormatPolicies(layers, axisConfigs)).toEqual([
      expect.objectContaining({ groupId: 'axis-left-id', coordinateUnit: 'seconds' }),
      expect.objectContaining({ groupId: 'axis-right-id', coordinateUnit: 'minutes' }),
    ]);
  });

  it('normalizes vertical reference lines to their data axis coordinate unit', () => {
    const data = dataLayer({
      layerId: 'data',
      columns: [column('seconds', duration('seconds', 'asSeconds'))],
      row: { seconds: 1 },
      accessors: ['seconds'],
    });
    const reference = referenceLayer('threshold', duration('milliseconds', 'asMilliseconds'), 1000);
    const layers: CommonXYLayerConfig[] = [data, reference];
    const policies = resolveAxisFormatPolicies(layers);
    const normalized = applyAxisFormatPolicies(layers, policies);

    expect(policies[0].members).toContainEqual(
      expect.objectContaining({ accessor: 'threshold', factor: 0.001, kind: 'reference' })
    );
    expect((normalized[1] as ReferenceLineLayerConfig).table.rows[0].threshold).toBe(1);
  });

  it('normalizes standalone reference lines from valueMeta rather than a table', () => {
    const data = dataLayer({
      layerId: 'data',
      columns: [column('seconds', duration('seconds', 'asSeconds'))],
      row: { seconds: 1 },
      accessors: ['seconds'],
    });
    const reference = standaloneReferenceLine(
      'threshold',
      duration('milliseconds', 'asMilliseconds'),
      1000
    );
    const layers: CommonXYLayerConfig[] = [data, reference];
    const policies = resolveAxisFormatPolicies(layers);
    const normalized = applyAxisFormatPolicies(layers, policies);

    expect(policies[0].members).toContainEqual(
      expect.objectContaining({ accessor: 'threshold', factor: 0.001, kind: 'reference' })
    );
    expect((normalized[1] as ReferenceLineConfig).decorations[0].value).toBe(1);
  });

  it('honors vis-dimension percent overrides from Visualize percentage mode', () => {
    const countColumn = column('count', { id: 'number' });
    const percentDimension: ExpressionValueVisDimension = {
      type: 'vis_dimension',
      accessor: countColumn,
      format: { id: 'percent' },
    };
    const [policy] = resolveAxisFormatPolicies([
      dataLayer({
        layerId: 'visualize',
        columns: [countColumn],
        row: { count: 10 },
        accessors: [percentDimension],
      }),
    ]);

    expect(policy.formatter).toEqual({ id: 'percent' });
  });

  it('normalizes duration values before retaining percentage presentation', () => {
    const layer = dataLayer({
      layerId: 'percentage',
      columns: [
        column('seconds', duration('seconds', 'asSeconds')),
        column('milliseconds', duration('milliseconds', 'asMilliseconds')),
      ],
      row: { seconds: 1, milliseconds: 1000 },
      accessors: ['seconds', 'milliseconds'],
      isPercentage: true,
    });

    const [policy] = resolveAxisFormatPolicies([layer]);
    expect(policy.formatter).toEqual({
      id: 'percent',
      params: { pattern: '0.[00]%' },
    });
    expect(policy.coordinateUnit).toBe('seconds');
    expect(policy.mismatches).toEqual([]);
  });

  it('preserves identity when no numerical conversion is needed', () => {
    const layer = dataLayer({
      layerId: 'first',
      columns: [column('count', { id: 'number' })],
      row: { count: 10 },
      accessors: ['count'],
    });
    const layers = [layer];
    const policies = resolveAxisFormatPolicies(layers);

    expect(applyAxisFormatPolicies(layers, policies)).toBe(layers);
  });

  it('does not copy layers when duration members already match the axis unit', () => {
    const layer = dataLayer({
      layerId: 'first',
      columns: [column('seconds', duration('seconds', 'asSeconds'))],
      row: { seconds: 12 },
      accessors: ['seconds'],
    });
    const layers = [layer];
    const policies = resolveAxisFormatPolicies(layers);

    expect(policies[0].members).toEqual([
      expect.objectContaining({ accessor: 'seconds', factor: 1 }),
    ]);
    expect(applyAxisFormatPolicies(layers, policies)).toBe(layers);
    expect(layer.table.rows[0].seconds).toBe(12);
  });

  it('copies only layers that need a conversion factor', () => {
    const converting = dataLayer({
      layerId: 'left',
      columns: [
        column('milliseconds', duration('milliseconds', 'asSeconds')),
        column('minutes', duration('minutes', 'asHours')),
      ],
      row: { milliseconds: 1000, minutes: 60 },
      accessors: ['milliseconds', 'minutes'],
      decorations: [
        { forAccessor: 'milliseconds', axisId: 'left-id' },
        { forAccessor: 'minutes', axisId: 'left-id' },
      ],
    });
    const unchanged = dataLayer({
      layerId: 'right',
      columns: [column('count', { id: 'number' })],
      row: { count: 7 },
      accessors: ['count'],
      decorations: [{ forAccessor: 'count', axisId: 'right-id' }],
    });
    const layers: CommonXYLayerConfig[] = [converting, unchanged];
    const axisConfigs: YAxisConfig[] = [
      { id: 'left-id', position: Position.Left },
      { id: 'right-id', position: Position.Right },
    ];
    const policies = resolveAxisFormatPolicies(layers, axisConfigs);
    const normalized = applyAxisFormatPolicies(layers, policies);

    expect(normalized).not.toBe(layers);
    expect(normalized[0]).not.toBe(converting);
    expect(normalized[1]).toBe(unchanged);
    expect((normalized[0] as CommonXYDataLayerConfig).table.rows[0]).toEqual({
      milliseconds: 1,
      minutes: 3600,
    });
    expect(converting.table.rows[0]).toEqual({ milliseconds: 1000, minutes: 60 });
  });
});
