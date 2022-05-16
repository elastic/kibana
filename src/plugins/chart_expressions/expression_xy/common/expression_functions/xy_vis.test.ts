/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { xyVisFunction } from '.';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import { Datatable } from '@kbn/expressions-plugin';
import { sampleArgs, sampleLayer, createSampleDatatableWithRows } from '../__mocks__';
import { XY_VIS } from '../constants';

describe('xyVis', () => {
  test('it renders with the specified data and args', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const { layerId, layerType, table, type, ...restLayerArgs } = sampleLayer;
    const result = await xyVisFunction.fn(
      data,
      { ...rest, ...restLayerArgs, referenceLineLayers: [], annotationLayers: [] },
      createMockExecutionContext()
    );

    expect(result).toEqual({
      type: 'render',
      as: XY_VIS,
      value: {
        args: {
          ...rest,
          layers: [{ layerType, table: data, layerId: 'dataLayers-0', type, ...restLayerArgs }],
        },
      },
    });
  });

  test('it should throw error if splitRowAccessor is pointing to the absent column', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const { layerId, layerType, table, type, ...restLayerArgs } = sampleLayer;
    const splitRowAccessor = 'absent-accessor';

    expect(
      xyVisFunction.fn(
        data,
        {
          ...rest,
          ...restLayerArgs,
          referenceLineLayers: [],
          annotationLayers: [],
          splitRowAccessor,
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('it should throw error if splitColumnAccessor is pointing to the absent column', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const { layerId, layerType, table, type, ...restLayerArgs } = sampleLayer;
    const splitColumnAccessor = 'absent-accessor';

    expect(
      xyVisFunction.fn(
        data,
        {
          ...rest,
          ...restLayerArgs,
          referenceLineLayers: [],
          annotationLayers: [],
          splitColumnAccessor,
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('it should normalize table if xAccessor related to date column but related row has string data', async () => {
    const { args } = sampleArgs();
    const data = createSampleDatatableWithRows([
      { a: 1, b: 2, c: '2022-05-07T06:25:00.000', d: 'Foo' },
      { a: 1, b: 2, c: '2022-05-08T06:25:00.000', d: 'Foo' },
      { a: 1, b: 2, c: '2022-05-09T06:25:00.000', d: 'Foo' },
    ]);
    const newData = {
      ...data,
      type: 'datatable',

      columns: data.columns.map((c) =>
        c.id !== 'c'
          ? c
          : {
              ...c,
              meta: {
                type: 'date',
              },
            }
      ),
    } as Datatable;
    const { layers, ...rest } = args;
    const { layerId, layerType, table, type, ...restLayerArgs } = sampleLayer;
    const expectedData = {
      ...newData,
      rows: newData.rows.map((row) => ({
        ...row,
        [restLayerArgs.xAccessor as string]: moment(
          row[restLayerArgs.xAccessor as string]
        ).valueOf(),
      })),
    };
    const result = await xyVisFunction.fn(
      newData,
      { ...rest, ...restLayerArgs, referenceLineLayers: [], annotationLayers: [] },
      createMockExecutionContext()
    );

    expect(result.value.args.layers[0]).toEqual({
      layerType,
      table: expectedData,
      layerId: 'dataLayers-0',
      type,
      ...restLayerArgs,
    });
  });
});
