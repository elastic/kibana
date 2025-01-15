/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ArrayEntry, ArrayNode } from '@elastic/charts';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { BucketColumns, ChartTypes } from '../../../common/types';
import { createMockPieParams, createMockVisData } from '../../mocks';
import { getPaletteRegistry } from '../../__mocks__/palettes';
import { getLayers } from './get_layers';

describe('getLayers', () => {
  it('preserves slice order for multi-metric layer', () => {
    const visData = createMockVisData();
    const columns: BucketColumns[] = [
      {
        id: 'col-0-0',
        name: 'Normal column',
        meta: { type: 'murmur3' },
      },
      {
        id: 'col-0-0',
        name: 'multi-metric column',
        meta: {
          type: 'number',
          sourceParams: {
            consolidatedMetricsColumn: true,
          },
        },
      },
    ];
    const visParams = createMockPieParams();
    const layers = getLayers(
      ChartTypes.PIE,
      columns,
      visParams,
      visData,
      {},
      [],
      getPaletteRegistry(),
      {},
      fieldFormatsMock,
      false,
      false
    );

    expect(layers[0].sortPredicate).toBeUndefined();
    expect(layers[1].sortPredicate).toBeDefined();

    const testNodes: ArrayEntry[] = [
      [
        '',
        {
          value: 2,
          inputIndex: [3],
        } as ArrayNode,
      ],
      [
        '',
        {
          value: 1,
          inputIndex: [2],
        } as ArrayNode,
      ],

      [
        '',
        {
          value: 3,
          inputIndex: [1],
        } as ArrayNode,
      ],
    ];

    const predicate = layers[1].sortPredicate!;
    testNodes.sort(predicate);

    expect(testNodes).toMatchInlineSnapshot(`
      Array [
        Array [
          "",
          Object {
            "inputIndex": Array [
              1,
            ],
            "value": 3,
          },
        ],
        Array [
          "",
          Object {
            "inputIndex": Array [
              2,
            ],
            "value": 1,
          },
        ],
        Array [
          "",
          Object {
            "inputIndex": Array [
              3,
            ],
            "value": 2,
          },
        ],
      ]
    `);
  });

  it('should handle empty slices with default label', () => {
    const visData = createMockVisData();
    const visDataWithNullValues = {
      ...visData,
      rows: [
        {
          'col-0-2': 'Null Airways',
          'col-1-1': null,
          'col-2-3': null,
          'col-3-1': null,
        },
      ],
    };

    const columns: BucketColumns[] = [
      {
        id: 'col-0-0',
        name: 'Normal column',
        meta: { type: 'murmur3' },
      },
      {
        id: 'col-0-0',
        name: 'multi-metric column',
        meta: {
          type: 'number',
          sourceParams: {
            consolidatedMetricsColumn: true,
          },
        },
      },
    ];
    const visParams = createMockPieParams();
    const layers = getLayers(
      ChartTypes.PIE,
      columns,
      visParams,
      visDataWithNullValues,
      {},
      [],
      getPaletteRegistry(),
      {},
      fieldFormatsMock,
      false,
      false
    );

    for (const layer of layers) {
      expect(layer.groupByRollup(visDataWithNullValues.rows[0], 0)).toEqual('(empty)');
      expect(layer.showAccessor?.(visDataWithNullValues.rows[0]['col-0-2'])).toEqual(true);
      expect(layer.nodeLabel?.(visDataWithNullValues.rows[0]['col-0-2'])).toEqual('Null Airways');
    }
  });
});
