/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { LATENCY_MAP_ROWS } from '../query/duration_rows';
import { getMapBands, parseOperationHistograms } from './operation_bands';
import type { OperationHistogram } from './operation_bands';

const stats = {
  min: 100,
  p90: 5_000,
  p95: 8_000,
  p99: 10_000,
  max: 2_000_000,
  spans: 1000,
};

const table = (values: Array<Array<string | number | null>>): ESQLSearchResponse =>
  ({
    columns: [
      { name: 'service.name', type: 'keyword' },
      { name: 'operation', type: 'keyword' },
      ...['yi', 'spans', 'failed'].map((name) => ({ name, type: 'long' })),
    ],
    values,
  } as ESQLSearchResponse);

/** A bimodal histogram of `spans` in all, half at row 5 and half at row 15. */
const bimodalHistogram = (service: string, name: string, spans: number): OperationHistogram => {
  const rowCounts = new Array<number>(LATENCY_MAP_ROWS).fill(0);
  rowCounts[5] = spans / 2;
  rowCounts[15] = spans / 2;
  return {
    operation: { service, name },
    spans,
    rowCounts,
    rowErrors: new Array<number>(LATENCY_MAP_ROWS).fill(0),
  };
};

describe('parseOperationHistograms', () => {
  it('builds one histogram per operation, scaled, dropping rows it cannot place', () => {
    const histograms = parseOperationHistograms(
      table([
        ['cart', 'GET /cart', 5, 40, 10],
        ['cart', 'GET /cart', 15, 20, 0],
        ['checkout', 'POST /checkout', 5, 30, 5],
        // Dropped: no operation, no service, and a row outside the map.
        ['cart', null, 5, 99, 0],
        [null, 'GET /cart', 5, 99, 0],
        ['cart', 'GET /cart', LATENCY_MAP_ROWS, 99, 0],
      ]),
      2
    );
    expect(histograms).toHaveLength(2);
    const [cart, checkout] = histograms;
    expect(cart.operation).toEqual({ service: 'cart', name: 'GET /cart' });
    expect(cart.spans).toBe(120);
    expect(cart.rowCounts[5]).toBe(80);
    expect(cart.rowCounts[15]).toBe(40);
    expect(cart.rowErrors[5]).toBe(20);
    expect(checkout.spans).toBe(60);
  });
});

describe('getMapBands', () => {
  it('focuses on an operation that holds nearly all the spans', () => {
    const bands = getMapBands(
      [bimodalHistogram('cart', 'GET /cart', 950), bimodalHistogram('cart', 'GET /other', 50)],
      stats
    );
    expect(bands.focused?.operation).toEqual({ service: 'cart', name: 'GET /cart' });
    expect(bands.focused?.bands).toHaveLength(2);
    expect(bands.operations).toEqual([]);
  });

  it('lists the operations with distinct groups otherwise, largest first', () => {
    const bands = getMapBands(
      [
        bimodalHistogram('cart', 'GET /cart', 400),
        bimodalHistogram('checkout', 'POST /checkout', 600),
        // Too thin for groups.
        bimodalHistogram('cart', 'GET /tiny', 60),
      ],
      stats
    );
    expect(bands.focused).toBeUndefined();
    expect(bands.operations.map(({ operation }) => operation.name)).toEqual([
      'POST /checkout',
      'GET /cart',
    ]);
    expect(bands.operations[0].share).toBeCloseTo(600 / 1060);
  });

  it('focuses on no operation when most spans of the map have no operation at all', () => {
    // 95 of the 100 named spans, but a tenth of the map: its bands would cover spans that
    // are not its, so the map stays mixed.
    const bands = getMapBands(
      [bimodalHistogram('cart', 'GET /cart', 95), bimodalHistogram('cart', 'GET /other', 5)],
      stats
    );
    expect(bands.focused).toBeUndefined();
  });

  it('returns nothing for no spans', () => {
    expect(getMapBands([], stats)).toEqual({ operations: [] });
  });
});
