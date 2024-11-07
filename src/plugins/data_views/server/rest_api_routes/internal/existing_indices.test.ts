/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseIndices } from './existing_indices';

describe('parseIndices', () => {
  it('should return an array of indices when given an array of indices', () => {
    const indices = ['index1', 'index2', 'index3'];
    const result = parseIndices(indices);
    expect(result).toEqual(indices);
  });

  it('should return an array of indices when given a JSON-stringified array of indices', () => {
    const indices = '["index1", "index2", "index3"]';
    const result = parseIndices(indices);
    expect(result).toEqual(['index1', 'index2', 'index3']);
  });

  it('should return an array with a single index when given a single index name', () => {
    const index = 'index1';
    const result = parseIndices(index);
    expect(result).toEqual(['index1']);
  });

  it('should throw an error when given an invalid JSON-stringified array', () => {
    const indices = '["index1", "index2"';
    expect(() => {
      parseIndices(indices);
    }).toThrowError(
      'indices should be an array of index aliases, a JSON-stringified array of index aliases, or a single index alias'
    );
  });

  it('should throw an error when given a string with a comma but not JSON-stringified', () => {
    const indices = 'index1,index2';
    expect(() => {
      parseIndices(indices);
    }).toThrowError(
      'indices should be an array of index aliases, a JSON-stringified array of index aliases, or a single index alias'
    );
  });

  it('should return an empty array when given an empty array', () => {
    const indices: string[] = [];
    const result = parseIndices(indices);
    expect(result).toEqual([]);
  });
});
