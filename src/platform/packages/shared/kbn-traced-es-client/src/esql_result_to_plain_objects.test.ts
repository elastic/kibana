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

describe('esqlResultToPlainObjects', () => {
  it('should return an empty array for an empty result', () => {
    const result: ESQLSearchResponse = {
      columns: [],
      values: [],
    };
    const output = esqlResultToPlainObjects(result);
    expect(output).toEqual([]);
  });

  it('should return plain objects', () => {
    const result: ESQLSearchResponse = {
      columns: [{ name: 'name', type: 'keyword' }],
      values: [['Foo Bar']],
    };
    const output = esqlResultToPlainObjects(result);
    expect(output).toEqual([{ name: 'Foo Bar' }]);
  });

  it('should not unflatten objects', () => {
    const result: ESQLSearchResponse = {
      columns: [
        { name: 'name', type: 'keyword' },
        { name: 'name.nested', type: 'keyword' },
      ],
      values: [['Foo Bar', 'Bar Foo']],
    };
    const output = esqlResultToPlainObjects(result);
    expect(output).toEqual([{ name: 'Foo Bar', 'name.nested': 'Bar Foo' }]);
  });
});
