/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PaletteOutput, PaletteDefinition } from '@kbn/coloring';
import { chartPluginMock } from '../../../../../charts/public/mocks';
import { Datatable } from '../../../../../expressions';
import { byDataColorPaletteMap } from './get_color';

describe('#byDataColorPaletteMap', () => {
  let datatable: Datatable;
  let paletteDefinition: PaletteDefinition;
  let palette: PaletteOutput;
  const columnId = 'foo';

  beforeEach(() => {
    datatable = {
      rows: [
        {
          [columnId]: '1',
        },
        {
          [columnId]: '2',
        },
      ],
    } as unknown as Datatable;
    paletteDefinition = chartPluginMock.createPaletteRegistry().get('default');
    palette = { type: 'palette' } as PaletteOutput;
  });

  it('should create byDataColorPaletteMap', () => {
    expect(byDataColorPaletteMap(datatable.rows, columnId, paletteDefinition, palette))
      .toMatchInlineSnapshot(`
      Object {
        "getColor": [Function],
      }
    `);
  });

  it('should get color', () => {
    const colorPaletteMap = byDataColorPaletteMap(
      datatable.rows,
      columnId,
      paletteDefinition,
      palette
    );

    expect(colorPaletteMap.getColor('1')).toBe('black');
  });

  it('should return undefined in case if values not in datatable', () => {
    const colorPaletteMap = byDataColorPaletteMap(
      datatable.rows,
      columnId,
      paletteDefinition,
      palette
    );

    expect(colorPaletteMap.getColor('wrong')).toBeUndefined();
  });

  it('should increase rankAtDepth for each new value', () => {
    const colorPaletteMap = byDataColorPaletteMap(
      datatable.rows,
      columnId,
      paletteDefinition,
      palette
    );
    colorPaletteMap.getColor('1');
    colorPaletteMap.getColor('2');

    expect(paletteDefinition.getCategoricalColor).toHaveBeenNthCalledWith(
      1,
      [{ name: '1', rankAtDepth: 0, totalSeriesAtDepth: 2 }],
      { behindText: false },
      undefined
    );

    expect(paletteDefinition.getCategoricalColor).toHaveBeenNthCalledWith(
      2,
      [{ name: '2', rankAtDepth: 1, totalSeriesAtDepth: 2 }],
      { behindText: false },
      undefined
    );
  });
});
