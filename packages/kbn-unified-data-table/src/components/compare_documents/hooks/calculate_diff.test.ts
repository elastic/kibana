/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { calculateDiff, formatDiffValue } from './calculate_diff';

describe('calculateDiff', () => {
  const baseValue = ['This is a message val'];
  const comparisonValue = ['This one is a different msg value'];
  const baseValueJson = ['gif', 'png'];
  const comparisonValueJson = ['png', 'jpg'];

  it('should return diffChars when diffMode is chars', () => {
    const result = calculateDiff({ diffMode: 'chars', baseValue, comparisonValue });
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 5,
          "value": "This ",
        },
        Object {
          "added": true,
          "count": 4,
          "removed": undefined,
          "value": "one ",
        },
        Object {
          "count": 5,
          "value": "is a ",
        },
        Object {
          "added": true,
          "count": 10,
          "removed": undefined,
          "value": "different ",
        },
        Object {
          "count": 1,
          "value": "m",
        },
        Object {
          "added": undefined,
          "count": 1,
          "removed": true,
          "value": "e",
        },
        Object {
          "count": 1,
          "value": "s",
        },
        Object {
          "added": undefined,
          "count": 2,
          "removed": true,
          "value": "sa",
        },
        Object {
          "count": 1,
          "value": "g",
        },
        Object {
          "added": undefined,
          "count": 1,
          "removed": true,
          "value": "e",
        },
        Object {
          "count": 4,
          "value": " val",
        },
        Object {
          "added": true,
          "count": 2,
          "removed": undefined,
          "value": "ue",
        },
      ]
    `);
  });

  it('should return diffWords when diffMode is words', () => {
    const result = calculateDiff({ diffMode: 'words', baseValue, comparisonValue });
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 2,
          "value": "This ",
        },
        Object {
          "added": true,
          "count": 2,
          "removed": undefined,
          "value": "one ",
        },
        Object {
          "count": 4,
          "value": "is a ",
        },
        Object {
          "added": undefined,
          "count": 1,
          "removed": true,
          "value": "message",
        },
        Object {
          "added": true,
          "count": 1,
          "removed": undefined,
          "value": "different",
        },
        Object {
          "count": 1,
          "value": " ",
        },
        Object {
          "added": undefined,
          "count": 1,
          "removed": true,
          "value": "val",
        },
        Object {
          "added": true,
          "count": 3,
          "removed": undefined,
          "value": "msg value",
        },
      ]
    `);
  });

  it('should return diffLines when diffMode is lines', () => {
    const result = calculateDiff({ diffMode: 'lines', baseValue, comparisonValue });
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "added": undefined,
          "count": 1,
          "removed": true,
          "value": "This is a message val",
        },
        Object {
          "added": true,
          "count": 1,
          "removed": undefined,
          "value": "This one is a different msg value",
        },
      ]
    `);
  });

  it('should return diffJson when diffMode is lines and values are json', () => {
    const result = calculateDiff({
      diffMode: 'lines',
      baseValue: baseValueJson,
      comparisonValue: comparisonValueJson,
    });
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 1,
          "value": "[
      ",
        },
        Object {
          "added": undefined,
          "count": 1,
          "removed": true,
          "value": "  \\"gif\\",
      ",
        },
        Object {
          "count": 1,
          "value": "  \\"png\\",
      ",
        },
        Object {
          "added": true,
          "count": 1,
          "removed": undefined,
          "value": "  \\"jpg\\"
      ",
        },
        Object {
          "count": 1,
          "value": "]",
        },
      ]
    `);
  });

  it('should force json when comparing a single value to multiple values', () => {
    const diffMode = 'lines';
    const result = calculateDiff({
      diffMode,
      baseValue: ['single value'],
      comparisonValue: ['multiple', 'values'],
    });
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 1,
          "value": "[
      ",
        },
        Object {
          "added": undefined,
          "count": 1,
          "removed": true,
          "value": "  \\"single value\\"
      ",
        },
        Object {
          "added": true,
          "count": 2,
          "removed": undefined,
          "value": "  \\"multiple\\",
        \\"values\\"
      ",
        },
        Object {
          "count": 1,
          "value": "]",
        },
      ]
    `);
    const result2 = calculateDiff({
      diffMode,
      baseValue: ['multiple', 'values'],
      comparisonValue: ['single value'],
    });
    expect(result2).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 1,
          "value": "[
      ",
        },
        Object {
          "added": undefined,
          "count": 2,
          "removed": true,
          "value": "  \\"multiple\\",
        \\"values\\"
      ",
        },
        Object {
          "added": true,
          "count": 1,
          "removed": undefined,
          "value": "  \\"single value\\"
      ",
        },
        Object {
          "count": 1,
          "value": "]",
        },
      ]
    `);
  });
});

describe('formatDiffValue', () => {
  it('should return a JSON stringified value when value is an object', () => {
    const result = formatDiffValue({ key: 'value' }, false);
    expect(result).toEqual({ value: '{\n  "key": "value"\n}', isJson: true });
  });

  it('should return a stringified value when value is not an object', () => {
    const result = formatDiffValue(42, false);
    expect(result).toEqual({ value: '42', isJson: false });
  });

  it('should return an empty string when value is null', () => {
    const result = formatDiffValue(null, false);
    expect(result).toEqual({ value: '', isJson: false });
  });

  it('should return an empty string when value is undefined', () => {
    const result = formatDiffValue(undefined, false);
    expect(result).toEqual({ value: '', isJson: false });
  });

  it('should extract the first entry when value is an array with a single entry', () => {
    const value = ['gif'];
    const result = formatDiffValue(value, false);
    expect(result).toEqual({ value: 'gif', isJson: false });
  });

  it('should return a JSON stringified value when forceJson is true', () => {
    const value = ['gif'];
    const result = formatDiffValue(value, true);
    expect(result).toEqual({ value: '[\n  "gif"\n]', isJson: true });
  });
});
