/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { esqlResultToPlainObjects } from './esql_result_to_plain_objects';

const col = (name: string, type: string = 'keyword') => ({ name, type });

describe('esqlResultToPlainObjects', () => {
  it('returns empty array when result has no rows', () => {
    const result: ESQLSearchResponse = {
      columns: [col('a'), col('b')],
      values: [],
    };
    expect(esqlResultToPlainObjects(result)).toEqual([]);
  });

  it('maps a single row to an object with column names as keys', () => {
    const result: ESQLSearchResponse = {
      columns: [col('host.name'), col('metric_name'), col('value', 'double')],
      values: [['host-01', 'cpu.usage', 0.42]],
    };
    expect(esqlResultToPlainObjects(result)).toEqual([
      { 'host.name': 'host-01', metric_name: 'cpu.usage', value: 0.42 },
    ]);
  });

  it('maps multiple rows to an array of objects', () => {
    const result: ESQLSearchResponse = {
      columns: [col('name'), col('count', 'long')],
      values: [
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ],
    };
    expect(esqlResultToPlainObjects(result)).toEqual([
      { name: 'a', count: 1 },
      { name: 'b', count: 2 },
      { name: 'c', count: 3 },
    ]);
  });

  it('preserves null and undefined in a single row', () => {
    const result: ESQLSearchResponse = {
      columns: [col('a'), col('b')],
      values: [[null, undefined]],
    };
    expect(esqlResultToPlainObjects(result)).toEqual([{ a: null, b: undefined }]);
  });

  it('skips columns when column is missing for an index', () => {
    const result: ESQLSearchResponse = {
      columns: [col('a')],
      values: [['x', 'orphan']],
    };
    expect(esqlResultToPlainObjects(result)).toEqual([{ a: 'x' }]);
  });

  it('uses first value when duplicate column names exist', () => {
    const result: ESQLSearchResponse = {
      columns: [col('x'), col('x')],
      values: [['first', 'second']],
    };
    expect(esqlResultToPlainObjects(result)).toEqual([{ x: 'first' }]);
  });

  it('handles typed generic for document shape', () => {
    interface Doc {
      'host.name': string;
      'system.cpu': number;
    }
    const result: ESQLSearchResponse = {
      columns: [col('host.name'), col('system.cpu', 'double')],
      values: [['host-01', 0.5]],
    };
    const docs = esqlResultToPlainObjects<Doc>(result);
    expect(docs).toHaveLength(1);
    expect(docs[0]['host.name']).toBe('host-01');
    expect(docs[0]['system.cpu']).toBe(0.5);
  });
});
