/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAP_PARAMS_REGEX, parseMapParams } from './maps';

describe('MAP_PARAMS_REGEX', () => {
  const regex = MAP_PARAMS_REGEX;

  it('should parse map parameters correctly', () => {
    const input =
      "{name='param1', values=['val1','val2'], description='This is param1', type=[string]}, {name='param2', values=['val3'], description='This is param2', type=[number]}";

    const matches = Array.from(input.matchAll(regex));

    expect(matches.length).toBe(2);

    expect(matches[0][1]).toBe('param1');
    expect(matches[0][2]).toBe("'val1','val2'");
    expect(matches[0][3]).toBe('This is param1');
    expect(matches[0][4]).toBe('string');

    expect(matches[1][1]).toBe('param2');
    expect(matches[1][2]).toBe("'val3'");
    expect(matches[1][3]).toBe('This is param2');
    expect(matches[1][4]).toBe('number');
  });

  it('should handle missing optional fields', () => {
    const input = "{name='param1', description='This is param1'}";

    const matches = Array.from(input.matchAll(regex));

    expect(matches.length).toBe(1);

    expect(matches[0][1]).toBe('param1');
    expect(matches[0][2]).toBeUndefined();
    expect(matches[0][3]).toBe('This is param1');
    expect(matches[0][4]).toBeUndefined();
  });

  it('should handle descriptions with escaped apostrophes', () => {
    const input = "{name='param1', description='It''s a great parameter', type=[string]}";

    const matches = Array.from(input.matchAll(regex));

    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('param1');
    expect(matches[0][3]).toBe("It''s a great parameter");
    expect(matches[0][4]).toBe('string');
  });

  it('should handle empty values in fields', () => {
    const input = "{name='', values=[], description='', type=[]}";

    const matches = Array.from(input.matchAll(regex));

    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('');
    expect(matches[0][2]).toBe('');
    expect(matches[0][3]).toBe('');
    expect(matches[0][4]).toBe('');
  });

  it('should handle multiple types in array', () => {
    const input = "{name='param1', description='Multi-type param', type=[string, keyword, text]}";

    const matches = Array.from(input.matchAll(regex));

    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('param1');
    expect(matches[0][3]).toBe('Multi-type param');
    expect(matches[0][4]).toBe('string, keyword, text');
  });

  it('should handle long descriptions with special characters', () => {
    const input =
      "{name='separator', description='This param''s value can''t be empty. A list of strings used as possible split points when chunking text. Each string can be a plain string or a\\nregular expression (regex) pattern.', type=[keyword]}";

    const matches = Array.from(input.matchAll(regex));

    expect(matches.length).toBe(1);
    expect(matches[0][1]).toBe('separator');
    expect(matches[0][3]).toContain("This param''s value can''t be empty");
    expect(matches[0][4]).toBe('keyword');
  });

  it('should parse consecutive map parameter definitions', () => {
    const input =
      "{name='param1'}, {name='param2', description='Second param'}, {name='param3', type=[boolean]}";

    const matches = Array.from(input.matchAll(regex));

    expect(matches.length).toBe(3);
    expect(matches[0][1]).toBe('param1');
    expect(matches[1][1]).toBe('param2');
    expect(matches[1][3]).toBe('Second param');
    expect(matches[2][1]).toBe('param3');
    expect(matches[2][4]).toBe('boolean');
  });
});

describe('parseMapParams', () => {
  it('should return empty object for empty input', () => {
    const result = parseMapParams('');

    expect(result).toEqual({});
  });

  it('should parse a single parameter with all fields', () => {
    const input = "{name='boost', values=[2.5], description='Boost value', type=[float]}";
    const result = parseMapParams(input);

    expect(result).toEqual({
      boost: {
        type: 'number',
        rawType: 'float',
        description: 'Boost value',
        values: ['2.5'],
      },
    });
  });

  it('should parse multiple parameters', () => {
    const input =
      "{name='boost', values=[2.5], description='Boost value', type=[float]}, {name='analyzer', values=[standard], description='analyzer used', type=[keyword]}";
    const result = parseMapParams(input);

    expect(result).toEqual({
      boost: {
        type: 'number',
        rawType: 'float',
        description: 'Boost value',
        values: ['2.5'],
      },
      analyzer: {
        type: 'string',
        rawType: 'keyword',
        description: 'analyzer used',
        values: ['standard'],
      },
    });
  });

  it('should handle boolean type', () => {
    const input = "{name='enabled', values=[true, false], type=[boolean]}";
    const result = parseMapParams(input);

    expect(result).toEqual({
      enabled: {
        type: 'boolean',
        rawType: 'boolean',
        description: '',
        values: ['true', 'false'],
      },
    });
  });

  it('should handle empty values array', () => {
    const input = "{name='param1', values=[], type=[keyword]}";
    const result = parseMapParams(input);

    expect(result.param1.values).toEqual([]);
  });

  it('should handle numeric types correctly', () => {
    const input =
      "{name='count', type=[integer]}, {name='percentage', type=[double]}, {name='size', type=[long]}";
    const result = parseMapParams(input);

    expect(result.count.type).toBe('number');
    expect(result.percentage.type).toBe('number');
    expect(result.size.type).toBe('number');
  });
});
