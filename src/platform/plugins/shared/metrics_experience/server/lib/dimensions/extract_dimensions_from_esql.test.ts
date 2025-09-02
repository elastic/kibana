/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractDimensionsFromESQL } from './extract_dimensions_from_esql';

describe('extractDimensionsFromESQL', () => {
  it('should extract dimensions from a simple ESQL query', () => {
    const esql = 'FROM my_index | STATS AVG(`cpu`) BY `host.name`';
    const result = extractDimensionsFromESQL(esql);
    expect(result).toEqual(['host.name']);
  });

  it('should extract multiple dimensions', () => {
    const esql = 'FROM my_index | STATS AVG(`cpu`) BY `host.name`, `cloud.provider`';
    const result = extractDimensionsFromESQL(esql);
    expect(result).toEqual(['host.name', 'cloud.provider']);
  });

  it('should return an empty array when there are no dimensions', () => {
    const esql = 'FROM my_index | STATS AVG(`cpu`)';
    const result = extractDimensionsFromESQL(esql);
    expect(result).toEqual([]);
  });

  it('should handle complex queries', () => {
    const esql = `
      FROM my_index
      | WHERE status == 200
      | STATS AVG(\`bytes\`) BY \`src_ip\`, \`dest_ip\`
      | SORT BY \`AVG(bytes)\` desc
    `;
    const result = extractDimensionsFromESQL(esql);
    expect(result).toEqual(['src_ip', 'dest_ip']);
  });

  it('should return an empty array for an empty query', () => {
    const esql = '';
    const result = extractDimensionsFromESQL(esql);
    expect(result).toEqual([]);
  });

  it('should handle queries with no stats command', () => {
    const esql = 'FROM my_index | WHERE status == 200';
    const result = extractDimensionsFromESQL(esql);
    expect(result).toEqual([]);
  });
});
