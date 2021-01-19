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

import { getDisplayedColumns } from './columns';
import { indexPatternWithTimefieldMock } from '../../__mocks__/index_pattern_with_timefield';
import { indexPatternMock } from '../../__mocks__/index_pattern';

describe('getDisplayedColumns', () => {
  test('returns default columns given a index pattern without timefield', async () => {
    const result = getDisplayedColumns([], indexPatternMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns default columns given a index pattern with timefield', async () => {
    const result = getDisplayedColumns([], indexPatternWithTimefieldMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns default columns when just timefield is in state', async () => {
    const result = getDisplayedColumns(['timestamp'], indexPatternWithTimefieldMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "_source",
      ]
    `);
  });
  test('returns columns given by argument, no fallback ', async () => {
    const result = getDisplayedColumns(['test'], indexPatternWithTimefieldMock);
    expect(result).toMatchInlineSnapshot(`
      Array [
        "test",
      ]
    `);
  });
});
