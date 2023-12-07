/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ArrayFromString } from './array_from_string';
import * as z from 'zod';

describe('ArrayFromString', () => {
  const itemsSchema = z.string();

  it('should return an array when input is a string', () => {
    const result = ArrayFromString(itemsSchema).parse('a,b,c');
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('should return an empty array when input is an empty string', () => {
    const result = ArrayFromString(itemsSchema).parse('');
    expect(result).toEqual([]);
  });

  it('should return the input as is when it is not a string', () => {
    const input = ['a', 'b', 'c'];
    const result = ArrayFromString(itemsSchema).parse(input);
    expect(result).toEqual(input);
  });

  it('should throw an error when input is not a string or an array', () => {
    expect(() => ArrayFromString(itemsSchema).parse(123)).toThrow();
  });
});
