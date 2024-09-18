/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PaletteOutput, PaletteDefinition } from '@kbn/coloring';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { byDataColorPaletteMap, SimplifiedArrayNode } from './get_color';
import type { SeriesLayer } from '@kbn/coloring';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { getColor } from './get_color';
import { createMockVisData, createMockBucketColumns, createMockPieParams } from '../../mocks';
import { generateFormatters } from '../formatters';
import { ChartTypes } from '../../../common/types';
import { getDistinctSeries } from '..';

describe('#byDataColorPaletteMap', () => {
  let paletteDefinition: PaletteDefinition;
  let palette: PaletteOutput;
  const visData = createMockVisData();
  const defaultFormatter = jest.fn((...args) => fieldFormatsMock.deserialize(...args));
  const formatters = generateFormatters(visData, defaultFormatter);

  beforeEach(() => {
    paletteDefinition = chartPluginMock.createPaletteRegistry().get('default');
    palette = { type: 'palette' } as PaletteOutput;
  });

  it('should create byDataColorPaletteMap', () => {
    expect(
      byDataColorPaletteMap(
        visData.rows,
        visData.columns[0],
        paletteDefinition,
        palette,
        formatters,
        fieldFormatsMock
      )
    ).toMatchInlineSnapshot(`
      Object {
        "getColor": [Function],
      }
    `);
  });

  it('should get color', () => {
    const colorPaletteMap = byDataColorPaletteMap(
      visData.rows,
      visData.columns[0],
      paletteDefinition,
      palette,
      formatters,
      fieldFormatsMock
    );

    expect(colorPaletteMap.getColor('Logstash Airways')).toBe('black');
  });

  it('should return undefined in case if values not in datatable', () => {
    const colorPaletteMap = byDataColorPaletteMap(
      visData.rows,
      visData.columns[0],
      paletteDefinition,
      palette,
      formatters,
      fieldFormatsMock
    );

    expect(colorPaletteMap.getColor('wrong')).toBeUndefined();
  });

  it('should increase rankAtDepth for each new value', () => {
    const colorPaletteMap = byDataColorPaletteMap(
      visData.rows,
      visData.columns[0],
      paletteDefinition,
      palette,
      formatters,
      fieldFormatsMock
    );
    colorPaletteMap.getColor('Logstash Airways');
    colorPaletteMap.getColor('JetBeats');

    expect(paletteDefinition.getCategoricalColor).toHaveBeenNthCalledWith(
      1,
      [{ name: 'Logstash Airways', rankAtDepth: 0, totalSeriesAtDepth: 4 }],
      { behindText: false },
      undefined
    );

    expect(paletteDefinition.getCategoricalColor).toHaveBeenNthCalledWith(
      2,
      [{ name: 'JetBeats', rankAtDepth: 1, totalSeriesAtDepth: 4 }],
      { behindText: false },
      undefined
    );
  });
});

describe('getColor', () => {
  const visData = createMockVisData();
  const buckets = createMockBucketColumns();
  const visParams = createMockPieParams();
  const colors = ['color1', 'color2', 'color3', 'color4'];
  interface RangeProps {
    gte: number;
    lt: number;
  }
  const defaultFormatter = jest.fn((...args) => fieldFormatsMock.deserialize(...args));
  const formatters = generateFormatters(visData, defaultFormatter);
  const distinctSeries = getDistinctSeries(visData.rows, buckets);
  const dataLength = { columnsLength: buckets.length, rowsLength: visData.rows.length };

  const fieldFormats = {
    deserialize: jest.fn(() => ({
      convert: jest.fn((s: RangeProps) => {
        return `≥ ${s.gte} and < ${s.lt}`;
      }),
    })),
  } as unknown as FieldFormatsStart;

  const getPaletteRegistry = () => {
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
  it('should return the correct color based on the parent sortIndex', () => {
    const d: SimplifiedArrayNode = {
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [
          ['ES-Air', undefined],
          ['Kibana Airlines', undefined],
        ],
        depth: 0,
        sortIndex: 0,
      },
      children: [],
    };

    const color = getColor(
      ChartTypes.PIE,
      'ES-Air',
      d,
      0,
      false,
      {},
      distinctSeries,
      dataLength,
      visParams,
      getPaletteRegistry(),
      { getColor: () => undefined },
      false,
      false,
      fieldFormats,
      visData.columns[0],
      formatters
    );
    expect(color).toEqual(colors[0]);
  });

  it('slices with the same label should have the same color for small multiples', () => {
    const d: SimplifiedArrayNode = {
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [
          ['ES-Air', undefined],
          ['Kibana Airlines', undefined],
        ],
        depth: 0,
        sortIndex: 0,
      },
      children: [],
    };
    const color = getColor(
      ChartTypes.PIE,
      'ES-Air',
      d,
      0,
      true,
      {},
      distinctSeries,
      dataLength,
      visParams,
      getPaletteRegistry(),
      { getColor: () => undefined },
      false,
      false,
      fieldFormats,
      visData.columns[0],
      formatters
    );
    expect(color).toEqual('color3');
  });
  it('returns the overwriteColor if exists', () => {
    const d: SimplifiedArrayNode = {
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [
          ['ES-Air', undefined],
          ['Kibana Airlines', undefined],
        ],
        depth: 0,
        sortIndex: 0,
      },
      children: [],
    };
    const color = getColor(
      ChartTypes.PIE,
      'ES-Air',
      d,
      0,
      true,
      { 'ES-Air': '#000028' },
      distinctSeries,
      dataLength,
      visParams,
      getPaletteRegistry(),
      { getColor: () => undefined },
      false,
      false,
      fieldFormats,
      visData.columns[0],
      formatters
    );
    expect(color).toEqual('#000028');
  });

  it('returns the overwriteColor for older visualizations with formatted values', () => {
    const d: SimplifiedArrayNode = {
      depth: 1,
      sortIndex: 0,
      parent: {
        children: [
          [
            {
              gte: 1000,
              lt: 2000,
            }.toString(),
            undefined,
          ],
          [
            {
              gte: 2000,
              lt: 3000,
            }.toString(),
            undefined,
          ],
        ],
        depth: 0,
        sortIndex: 0,
      },
      children: [],
    };
    const visParamsNew = {
      ...visParams,
      distinctColors: true,
    };
    const column = {
      ...visData.columns[0],
      format: {
        id: 'range',
        params: {
          id: 'number',
        },
      },
    };
    const color = getColor(
      ChartTypes.PIE,
      // There is the unhandled situation that the categoricalName passed is not a plain string but a RangeKey
      // In this case, the internal code, thankfully, requires the stringified version of it and/or the formatted one
      // handling also this badly configured type
      // FIXME when getColor could handle both strings and RangeKey
      { gte: 1000, lt: 2000 } as unknown as string,
      d,
      0,
      true,
      { '≥ 1000 and < 2000': '#3F6833' },
      distinctSeries,
      dataLength,
      visParamsNew,
      getPaletteRegistry(),
      { getColor: () => undefined },
      false,
      false,
      fieldFormats,
      column,
      formatters
    );
    expect(color).toEqual('#3F6833');
  });

  it('should only pass the second layer for mosaic', () => {
    const d: SimplifiedArrayNode = {
      depth: 2,
      sortIndex: 0,
      parent: {
        children: [
          ['Second level 1', undefined],
          ['Second level 2', undefined],
        ],
        depth: 1,
        sortIndex: 0,
        parent: {
          children: [['First level', undefined]],
          depth: 0,
          sortIndex: 0,
        },
      },
      children: [],
    };
    const registry = getPaletteRegistry();
    getColor(
      ChartTypes.MOSAIC,
      'Second level 1',
      d,
      1,
      true,
      {},
      distinctSeries,
      dataLength,
      visParams,
      registry,
      undefined,
      true,
      false,
      fieldFormats,
      visData.columns[0],
      formatters
    );
    expect(registry.get().getCategoricalColor).toHaveBeenCalledWith(
      [expect.objectContaining({ name: 'Second level 1' })],
      expect.anything(),
      expect.anything()
    );
  });

  it('should only pass the first layer for treemap', () => {
    const d: SimplifiedArrayNode = {
      depth: 2,
      sortIndex: 0,
      parent: {
        children: [
          ['Second level 1', undefined],
          ['Second level 2', undefined],
        ],
        depth: 1,
        sortIndex: 0,
        parent: {
          children: [['First level', undefined]],
          depth: 0,
          sortIndex: 0,
        },
      },
      children: [],
    };
    const registry = getPaletteRegistry();
    getColor(
      ChartTypes.TREEMAP,
      'Second level 1',
      d,
      1,
      true,
      {},
      distinctSeries,
      dataLength,
      visParams,
      registry,
      undefined,
      true,
      false,
      fieldFormats,
      visData.columns[0],
      formatters
    );
    expect(registry.get().getCategoricalColor).toHaveBeenCalledWith(
      [expect.objectContaining({ name: 'First level' })],
      expect.anything(),
      expect.anything()
    );
  });
});
