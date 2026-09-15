/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { layeredXyVisFunction } from '.';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import {
  TablesAdapter,
  type Datatable,
  type DefaultInspectorAdapters,
  type ExecutionContext,
} from '@kbn/expressions-plugin/common';
import { sampleArgs, sampleExtendedLayer } from '../test_utils';
import { XY_VIS } from '../constants';
import type { ExtendedDataLayerConfig } from '../types';

describe('layeredXyVis', () => {
  test('it renders with the specified data and args', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const result = await layeredXyVisFunction.fn(
      data,
      { ...rest, layers: [sampleExtendedLayer] },
      createMockExecutionContext()
    );

    expect(result).toEqual({
      type: 'render',
      as: XY_VIS,
      value: {
        args: {
          ...rest,
          layers: [sampleExtendedLayer],
          axisFormatPolicies: expect.any(Array),
        },
        syncColors: false,
        syncTooltips: false,
        syncCursor: true,
        canNavigateToLens: false,
      },
    });
    expect((result.value.args.layers[0] as ExtendedDataLayerConfig).table).toBe(
      sampleExtendedLayer.table
    );
  });

  test('logs original tables before normalizing immutable chart layers', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const durationLayer = {
      ...sampleExtendedLayer,
      accessors: ['a'],
      table: {
        ...sampleExtendedLayer.table,
        columns: sampleExtendedLayer.table.columns.map((column) =>
          column.id === 'a'
            ? {
                ...column,
                meta: {
                  ...column.meta,
                  params: {
                    id: 'duration',
                    params: { inputFormat: 'milliseconds', outputFormat: 'asSeconds' },
                  },
                },
              }
            : column
        ),
        rows: [{ a: 1000 }],
      },
    };
    const context =
      createMockExecutionContext() as unknown as ExecutionContext<DefaultInspectorAdapters>;
    const tables = new TablesAdapter();
    context.inspectorAdapters.tables = tables;
    const logDatatable = jest.spyOn(tables, 'logDatatable');
    const result = await layeredXyVisFunction.fn(
      data,
      { ...rest, layers: [durationLayer] },
      context
    );

    expect(logDatatable).toHaveBeenCalledWith(
      'first',
      expect.objectContaining({ rows: [{ a: 1000 }] })
    );
    expect((result.value.args.layers[0] as ExtendedDataLayerConfig).table.rows).toEqual([{ a: 1 }]);
    expect(durationLayer.table.rows).toEqual([{ a: 1000 }]);
  });

  test('converts mixed humanizePrecise durations on one axis before render', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const table: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: 'milliseconds',
          name: 'milliseconds',
          meta: {
            type: 'number',
            params: {
              id: 'duration',
              params: { inputFormat: 'milliseconds', outputFormat: 'humanizePrecise' },
            },
          },
        },
        {
          id: 'seconds',
          name: 'seconds',
          meta: {
            type: 'number',
            params: {
              id: 'duration',
              params: { inputFormat: 'seconds', outputFormat: 'humanizePrecise' },
            },
          },
        },
      ],
      rows: [{ milliseconds: 1000, seconds: 1 }],
    };
    const durationLayer: ExtendedDataLayerConfig = {
      ...sampleExtendedLayer,
      accessors: ['milliseconds', 'seconds'],
      splitAccessors: undefined,
      xAccessor: undefined,
      table,
    };
    const result = await layeredXyVisFunction.fn(
      data,
      { ...rest, layers: [durationLayer] },
      createMockExecutionContext()
    );

    expect((result.value.args.layers[0] as ExtendedDataLayerConfig).table.rows[0]).toEqual({
      milliseconds: 1,
      seconds: 1,
    });
    expect(result.value.args.axisFormatPolicies).toEqual([
      expect.objectContaining({
        groupId: 'left',
        coordinateUnit: 'seconds',
        formatter: expect.objectContaining({
          params: expect.objectContaining({
            inputFormat: 'seconds',
            outputFormat: 'humanizePrecise',
          }),
        }),
      }),
    ]);
    expect(table.rows[0]).toEqual({ milliseconds: 1000, seconds: 1 });
  });

  test('does not convert a duration follower when the first series is unformatted', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const table: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'raw', name: 'raw', meta: { type: 'number' } },
        {
          id: 'milliseconds',
          name: 'milliseconds',
          meta: {
            type: 'number',
            params: {
              id: 'duration',
              params: { inputFormat: 'milliseconds', outputFormat: 'asSeconds' },
            },
          },
        },
      ],
      rows: [{ raw: 42, milliseconds: 1000 }],
    };
    const layer: ExtendedDataLayerConfig = {
      ...sampleExtendedLayer,
      accessors: ['raw', 'milliseconds'],
      splitAccessors: undefined,
      xAccessor: undefined,
      decorations: [
        { type: 'dataDecorationConfig', forAccessor: 'raw', axisId: 'shared' },
        { type: 'dataDecorationConfig', forAccessor: 'milliseconds', axisId: 'shared' },
      ],
      table,
    };
    const result = await layeredXyVisFunction.fn(
      data,
      {
        ...rest,
        yAxisConfigs: [{ type: 'yAxisConfig', id: 'shared', position: 'left' }],
        layers: [layer],
      },
      createMockExecutionContext()
    );

    expect((result.value.args.layers[0] as ExtendedDataLayerConfig).table.rows[0]).toEqual({
      raw: 42,
      milliseconds: 1000,
    });
    expect(result.value.args.axisFormatPolicies).toEqual([
      expect.objectContaining({
        groupId: 'axis-shared',
        coordinateUnit: undefined,
        formatter: { id: 'number' },
        anchor: { layerId: 'first', accessor: 'raw' },
      }),
    ]);
  });

  test('it should throw error if markSizeRatio is lower then 1 or greater then 100', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;

    expect(
      layeredXyVisFunction.fn(
        data,
        {
          ...rest,
          markSizeRatio: 0,
          layers: [sampleExtendedLayer],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();

    expect(
      layeredXyVisFunction.fn(
        data,
        {
          ...rest,
          markSizeRatio: 101,
          layers: [sampleExtendedLayer],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('it should throw error if markSizeRatio is specified if no markSizeAccessor is present', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;

    expect(
      layeredXyVisFunction.fn(
        data,
        {
          ...rest,
          markSizeRatio: 10,
          layers: [sampleExtendedLayer],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });
});
