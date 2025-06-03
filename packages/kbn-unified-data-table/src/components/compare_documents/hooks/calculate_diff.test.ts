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
          "added": false,
          "count": 5,
          "removed": false,
          "value": "This ",
        },
        Object {
          "added": true,
          "count": 4,
          "removed": false,
          "value": "one ",
        },
        Object {
          "added": false,
          "count": 5,
          "removed": false,
          "value": "is a ",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": true,
          "value": "m",
        },
        Object {
          "added": true,
          "count": 4,
          "removed": false,
          "value": "diff",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": false,
          "value": "e",
        },
        Object {
          "added": true,
          "count": 6,
          "removed": false,
          "value": "rent m",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": false,
          "value": "s",
        },
        Object {
          "added": false,
          "count": 2,
          "removed": true,
          "value": "sa",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": false,
          "value": "g",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": true,
          "value": "e",
        },
        Object {
          "added": false,
          "count": 4,
          "removed": false,
          "value": " val",
        },
        Object {
          "added": true,
          "count": 2,
          "removed": false,
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
          "added": false,
          "count": 2,
          "removed": false,
          "value": "This ",
        },
        Object {
          "added": true,
          "count": 2,
          "removed": false,
          "value": "one ",
        },
        Object {
          "added": false,
          "count": 4,
          "removed": false,
          "value": "is a ",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": true,
          "value": "message",
        },
        Object {
          "added": true,
          "count": 1,
          "removed": false,
          "value": "different",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": false,
          "value": " ",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": true,
          "value": "val",
        },
        Object {
          "added": true,
          "count": 3,
          "removed": false,
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
          "added": false,
          "count": 1,
          "removed": true,
          "value": "This is a message val",
        },
        Object {
          "added": true,
          "count": 1,
          "removed": false,
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
          "added": false,
          "count": 1,
          "removed": false,
          "value": "[
      ",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": true,
          "value": "  \\"gif\\",
      ",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": false,
          "value": "  \\"png\\",
      ",
        },
        Object {
          "added": true,
          "count": 1,
          "removed": false,
          "value": "  \\"jpg\\"
      ",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": false,
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
          "added": false,
          "count": 1,
          "removed": false,
          "value": "[
      ",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": true,
          "value": "  \\"single value\\"
      ",
        },
        Object {
          "added": true,
          "count": 2,
          "removed": false,
          "value": "  \\"multiple\\",
        \\"values\\"
      ",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": false,
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
          "added": false,
          "count": 1,
          "removed": false,
          "value": "[
      ",
        },
        Object {
          "added": false,
          "count": 2,
          "removed": true,
          "value": "  \\"multiple\\",
        \\"values\\"
      ",
        },
        Object {
          "added": true,
          "count": 1,
          "removed": false,
          "value": "  \\"single value\\"
      ",
        },
        Object {
          "added": false,
          "count": 1,
          "removed": false,
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
