/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ShapeTreeNode } from '@elastic/charts';
import { PaletteDefinition, SeriesLayer } from '../../../charts/public';
import { computeColor } from './get_layers';
import { createMockVisData, createMockBucketColumns, createMockPieParams } from '../mocks';

const visData = createMockVisData();
const buckets = createMockBucketColumns();
const visParams = createMockPieParams();
const colors = ['color1', 'color2', 'color3', 'color4'];
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
    const d = ({
      dataName: 'ES-Air',
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [['ES-Air'], ['Kibana Airlines']],
        depth: 0,
        sortIndex: 0,
      },
    } as unknown) as ShapeTreeNode;
    const color = computeColor(
      d,
      false,
      {},
      buckets,
      visData.rows,
      visParams,
      getPaletteRegistry(),
      false
    );
    expect(color).toEqual(colors[0]);
  });

  it('slices with the same label should have the same color for small multiples', () => {
    const d = ({
      dataName: 'ES-Air',
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [['ES-Air'], ['Kibana Airlines']],
        depth: 0,
        sortIndex: 0,
      },
    } as unknown) as ShapeTreeNode;
    const color = computeColor(
      d,
      true,
      {},
      buckets,
      visData.rows,
      visParams,
      getPaletteRegistry(),
      false
    );
    expect(color).toEqual('color3');
  });
  it('returns the overwriteColor if exists', () => {
    const d = ({
      dataName: 'ES-Air',
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [['ES-Air'], ['Kibana Airlines']],
        depth: 0,
        sortIndex: 0,
      },
    } as unknown) as ShapeTreeNode;
    const color = computeColor(
      d,
      true,
      { 'ES-Air': '#000028' },
      buckets,
      visData.rows,
      visParams,
      getPaletteRegistry(),
      false
    );
    expect(color).toEqual('#000028');
  });
});
