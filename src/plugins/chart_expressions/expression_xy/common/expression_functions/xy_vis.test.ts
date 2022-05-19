/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { xyVisFunction } from '.';
import { Datatable } from '@kbn/expressions-plugin/common';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';
import { sampleArgs, sampleLayer } from '../__mocks__';
import { XY_VIS } from '../constants';

describe('xyVis', () => {
  test('it renders with the specified data and args', async () => {
    const { data, args } = sampleArgs();
    const newData = {
      ...data,
      type: 'datatable',

      columns: data.columns.map((c) =>
        c.id !== 'c'
          ? c
          : {
              ...c,
              meta: {
                type: 'string',
              },
            }
      ),
    } as Datatable;
    const { layers, ...rest } = args;
    const { layerId, layerType, table, type, ...restLayerArgs } = sampleLayer;
    const result = await xyVisFunction.fn(
      newData,
      { ...rest, ...restLayerArgs, referenceLineLayers: [], annotationLayers: [] },
      createMockExecutionContext()
    );

    expect(result).toEqual({
      type: 'render',
      as: XY_VIS,
      value: {
        args: {
          ...rest,
          layers: [{ layerType, table: newData, layerId: 'dataLayers-0', type, ...restLayerArgs }],
        },
      },
    });
  });

  test('it should throw error if markSizeRatio is lower then 1 or greater then 100', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    expect(
      xyVisFunction.fn(
        data,
        {
          ...rest,
          ...{ ...sampleLayer, markSizeAccessor: 'b' },
          markSizeRatio: 0,
          referenceLineLayers: [],
          annotationLayers: [],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();

    expect(
      xyVisFunction.fn(
        data,
        {
          ...rest,
          ...{ ...sampleLayer, markSizeAccessor: 'b' },
          markSizeRatio: 101,
          referenceLineLayers: [],
          annotationLayers: [],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });
  test('it should throw error if minTimeBarInterval is invalid', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const { layerId, layerType, table, type, ...restLayerArgs } = sampleLayer;
    expect(
      xyVisFunction.fn(
        data,
        {
          ...rest,
          ...restLayerArgs,
          minTimeBarInterval: '1q',
          referenceLineLayers: [],
          annotationLayers: [],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test('it should throw error if minTimeBarInterval applied for not time bar chart', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const { layerId, layerType, table, type, ...restLayerArgs } = sampleLayer;
    expect(
      xyVisFunction.fn(
        data,
        {
          ...rest,
          ...restLayerArgs,
          minTimeBarInterval: '1h',
          referenceLineLayers: [],
          annotationLayers: [],
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
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

  test('it should throw error if markSizeRatio is specified while markSizeAccessor is not', async () => {
    const { data, args } = sampleArgs();
    const { layers, ...rest } = args;
    const { layerId, layerType, table, type, ...restLayerArgs } = sampleLayer;

    expect(
      xyVisFunction.fn(
        data,
        {
          ...rest,
          ...restLayerArgs,
          referenceLineLayers: [],
          annotationLayers: [],
          markSizeRatio: 5,
        },
        createMockExecutionContext()
      )
    ).rejects.toThrowErrorMatchingSnapshot();
  });
});
