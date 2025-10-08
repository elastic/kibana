/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ArrayEntry, ArrayNode } from '@elastic/charts';

import type { BucketColumns } from '../../../common/types';
import { ChartTypes } from '../../../common/types';
import { createMockPieParams, createMockVisData } from '../../mocks';
import { getPaletteRegistry } from '../../__mocks__/palettes';
import { getLayers } from './get_layers';
import { getKbnPalettes } from '@kbn/palettes';
import { generateFormatters } from '../formatters';
import { getFieldFormatsRegistry } from '@kbn/field-formats-plugin/public/mocks';
import { type CoreSetup } from '@kbn/core/public';
import { getAggsFormats } from '@kbn/data-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { EMPTY_LABEL, MISSING_TOKEN, NULL_LABEL } from '@kbn/field-formats-common';

describe('getLayers', () => {
  // use the current fieldFormatRegistry
  const fieldFormatsRegistry = getFieldFormatsRegistry({
    uiSettings: { get: jest.fn() },
  } as unknown as CoreSetup);

  // attach the required aggsFormats to allow formatting special charts in esaggs
  fieldFormatsRegistry.register(
    getAggsFormats((serializedFieldFormat) =>
      fieldFormatsRegistry.deserialize(serializedFieldFormat)
    )
  );

  const palettes = getKbnPalettes({ name: 'amsterdam', darkMode: false });

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
      palettes,
      {},
      fieldFormatsRegistry,
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
    const visDataWithNullValues: Datatable = {
      type: 'datatable',
      columns: [
        {
          id: 'category',
          name: 'Category',
          meta: {
            type: 'string',
            params: {
              id: 'terms',
              params: {
                id: 'string',
                otherBucketLabel: 'Passed other label',
                missingBucket: true,
                missingBucketLabel: 'Passed missing label',
              },
            },
          },
        },
        {
          id: 'value',
          name: 'Value',
          meta: { type: 'number', params: { id: 'number' } },
        },
      ],
      rows: [
        { category: '', value: 10 },
        { category: null, value: 10 },
        { category: MISSING_TOKEN, value: 10 },
        { category: '__other__', value: 10 },
      ],
    };

    const visParams = createMockPieParams();
    const formatters = generateFormatters(visDataWithNullValues, fieldFormatsRegistry.deserialize);
    const layers = getLayers(
      ChartTypes.PIE,
      [visDataWithNullValues.columns[0]], // only the bucket column
      visParams,
      visDataWithNullValues,
      {},
      [],
      getPaletteRegistry(),
      palettes,
      formatters,
      fieldFormatsRegistry,
      false,
      false
    );
    for (const layer of layers) {
      expect(layer.showAccessor?.(visDataWithNullValues.rows[0].category)).toEqual(true);
      expect(layer.nodeLabel?.(visDataWithNullValues.rows[0].category)).toEqual(EMPTY_LABEL);

      expect(layer.showAccessor?.(visDataWithNullValues.rows[1].category)).toEqual(true);
      expect(layer.nodeLabel?.(visDataWithNullValues.rows[1].category)).toEqual(NULL_LABEL);

      // this tests the missingBucketLabel property used only in visualize
      expect(layer.showAccessor?.(visDataWithNullValues.rows[2].category)).toEqual(true);
      expect(layer.nodeLabel?.(visDataWithNullValues.rows[2].category)).toEqual(
        'Passed missing label'
      );

      expect(layer.showAccessor?.(visDataWithNullValues.rows[3].category)).toEqual(true);
      expect(layer.nodeLabel?.(visDataWithNullValues.rows[3].category)).toEqual(
        'Passed other label'
      );
    }
  });
});
