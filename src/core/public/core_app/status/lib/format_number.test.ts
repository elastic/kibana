/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { formatNumber } from './format_number';

describe('format byte', () => {
  test('zero', () => {
    expect(formatNumber(0, 'byte')).toMatchInlineSnapshot(`"0.00 B"`);
  });

  test('mb', () => {
    expect(formatNumber(181142512, 'byte')).toMatchInlineSnapshot(`"172.75 MB"`);
  });

  test('gb', () => {
    expect(formatNumber(273727485000, 'byte')).toMatchInlineSnapshot(`"254.93 GB"`);
  });
});

describe('format time', () => {
  test('zero', () => {
    expect(formatNumber(0, 'time')).toMatchInlineSnapshot(`"0.00 ms"`);
  });

  test('sub ms', () => {
    expect(formatNumber(0.128, 'time')).toMatchInlineSnapshot(`"0.13 ms"`);
  });

  test('many ms', () => {
    expect(formatNumber(3030.284, 'time')).toMatchInlineSnapshot(`"3030.28 ms"`);
  });
});

describe('format integer', () => {
  test('zero', () => {
    expect(formatNumber(0, 'integer')).toMatchInlineSnapshot(`"0"`);
  });

  test('sub integer', () => {
    expect(formatNumber(0.728, 'integer')).toMatchInlineSnapshot(`"1"`);
  });

  test('many integer', () => {
    expect(formatNumber(3030.284, 'integer')).toMatchInlineSnapshot(`"3030"`);
  });
});

describe('format float', () => {
  test('zero', () => {
    expect(formatNumber(0, 'float')).toMatchInlineSnapshot(`"0.00"`);
  });

  test('sub integer', () => {
    expect(formatNumber(0.728, 'float')).toMatchInlineSnapshot(`"0.73"`);
  });

  test('many integer', () => {
    expect(formatNumber(3030.284, 'float')).toMatchInlineSnapshot(`"3030.28"`);
  });
});

describe('format default', () => {
  test('zero', () => {
    expect(formatNumber(0)).toMatchInlineSnapshot(`"0.00"`);
  });

  test('sub integer', () => {
    expect(formatNumber(0.464)).toMatchInlineSnapshot(`"0.46"`);
  });

  test('many integer', () => {
    expect(formatNumber(6237.291)).toMatchInlineSnapshot(`"6237.29"`);
  });
});
