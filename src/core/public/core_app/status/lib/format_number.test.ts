/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
