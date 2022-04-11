/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ShapeTreeNode } from '@elastic/charts';
import type { PaletteDefinition, SeriesLayer } from '@kbn/coloring';
import { dataPluginMock } from '../../../../../data/public/mocks';
import type { DataPublicPluginStart } from '../../../../../data/public';
import { getColor } from './get_color';
import { createMockVisData, createMockBucketColumns, createMockPieParams } from '../../mocks';
import { ChartTypes } from '../../../common/types';

const visData = createMockVisData();
const buckets = createMockBucketColumns();
const visParams = createMockPieParams();
const colors = ['color1', 'color2', 'color3', 'color4'];
const dataMock = dataPluginMock.createStartContract();
interface RangeProps {
  gte: number;
  lt: number;
}

dataMock.fieldFormats = {
  deserialize: jest.fn(() => ({
    convert: jest.fn((s: RangeProps) => {
      return `≥ ${s.gte} and < ${s.lt}`;
    }),
  })),
} as unknown as DataPublicPluginStart['fieldFormats'];

export const getPaletteRegistry = () => {
  const mockPalette1: jest.Mocked<PaletteDefinition> = {
    id: 'default',
    title: 'My Palette',
    getCategoricalColor: jest.fn((layer: SeriesLayer[]) => colors[layer[0].rankAtDepth]),
    getCategoricalColors: jest.fn((num: number) => colors),
    toExpression: jest.fn(() => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'system_palette',
          arguments: {
            name: ['default'],
          },
        },
      ],
    })),
  };

  return {
    get: () => mockPalette1,
    getAll: () => [mockPalette1],
  };
};

describe('computeColor', () => {
  it('should return the correct color based on the parent sortIndex', () => {
    const d = {
      dataName: 'ES-Air',
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [['ES-Air'], ['Kibana Airlines']],
        depth: 0,
        sortIndex: 0,
      },
    } as unknown as ShapeTreeNode;
    const color = getColor(
      ChartTypes.PIE,
      d,
      0,
      false,
      {},
      buckets,
      visData.rows,
      visParams,
      getPaletteRegistry(),
      { getColor: () => undefined },
      false,
      false,
      dataMock.fieldFormats
    );
    expect(color).toEqual(colors[0]);
  });

  it('slices with the same label should have the same color for small multiples', () => {
    const d = {
      dataName: 'ES-Air',
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [['ES-Air'], ['Kibana Airlines']],
        depth: 0,
        sortIndex: 0,
      },
    } as unknown as ShapeTreeNode;
    const color = getColor(
      ChartTypes.PIE,
      d,
      0,
      true,
      {},
      buckets,
      visData.rows,
      visParams,
      getPaletteRegistry(),
      { getColor: () => undefined },
      false,
      false,
      dataMock.fieldFormats
    );
    expect(color).toEqual('color3');
  });
  it('returns the overwriteColor if exists', () => {
    const d = {
      dataName: 'ES-Air',
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [['ES-Air'], ['Kibana Airlines']],
        depth: 0,
        sortIndex: 0,
      },
    } as unknown as ShapeTreeNode;
    const color = getColor(
      ChartTypes.PIE,
      d,
      0,
      true,
      { 'ES-Air': '#000028' },
      buckets,
      visData.rows,
      visParams,
      getPaletteRegistry(),
      { getColor: () => undefined },
      false,
      false,
      dataMock.fieldFormats
    );
    expect(color).toEqual('#000028');
  });

  it('returns the overwriteColor for older visualizations with formatted values', () => {
    const d = {
      dataName: {
        gte: 1000,
        lt: 2000,
      },
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [
          [
            {
              gte: 1000,
              lt: 2000,
            },
          ],
          [
            {
              gte: 2000,
              lt: 3000,
            },
          ],
        ],
        depth: 0,
        sortIndex: 0,
      },
    } as unknown as ShapeTreeNode;
    const visParamsNew = {
      ...visParams,
      distinctColors: true,
    };
    const color = getColor(
      ChartTypes.PIE,
      d,
      0,
      true,
      { '≥ 1000 and < 2000': '#3F6833' },
      buckets,
      visData.rows,
      visParamsNew,
      getPaletteRegistry(),
      { getColor: () => undefined },
      false,
      false,
      dataMock.fieldFormats,
      {
        id: 'range',
        params: {
          id: 'number',
        },
      }
    );
    expect(color).toEqual('#3F6833');
  });

  it('should only pass the second layer for mosaic', () => {
    const d = {
      dataName: 'Second level 1',
      depth: 2,
      sortIndex: 0,
      parent: {
        children: [['Second level 1'], ['Second level 2']],
        depth: 1,
        sortIndex: 0,
        parent: {
          children: [['First level']],
          depth: 0,
          sortIndex: 0,
        },
      },
    } as unknown as ShapeTreeNode;
    const registry = getPaletteRegistry();
    getColor(
      ChartTypes.MOSAIC,
      d,
      1,
      true,
      {},
      buckets,
      visData.rows,
      visParams,
      registry,
      undefined,
      true,
      false,
      dataMock.fieldFormats
    );
    expect(registry.get().getCategoricalColor).toHaveBeenCalledWith(
      [expect.objectContaining({ name: 'Second level 1' })],
      expect.anything(),
      expect.anything()
    );
  });

  it('should only pass the first layer for treemap', () => {
    const d = {
      dataName: 'Second level 1',
      depth: 2,
      sortIndex: 0,
      parent: {
        children: [['Second level 1'], ['Second level 2']],
        depth: 1,
        sortIndex: 0,
        parent: {
          children: [['First level']],
          depth: 0,
          sortIndex: 0,
        },
      },
    } as unknown as ShapeTreeNode;
    const registry = getPaletteRegistry();
    getColor(
      ChartTypes.TREEMAP,
      d,
      1,
      true,
      {},
      buckets,
      visData.rows,
      visParams,
      registry,
      undefined,
      true,
      false,
      dataMock.fieldFormats
    );
    expect(registry.get().getCategoricalColor).toHaveBeenCalledWith(
      [expect.objectContaining({ name: 'First level' })],
      expect.anything(),
      expect.anything()
    );
  });
});
