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

import { dataPluginMock } from '../../../data/public/mocks';
import { extractIndexPatternsFromSpec } from './extract_index_pattern';
import { setData } from '../services';

import type { VegaSpec } from '../data_model/types';

const getMockedSpec = (mockedObj: any) => (mockedObj as unknown) as VegaSpec;

describe('extractIndexPatternsFromSpec', () => {
  const dataStart = dataPluginMock.createStartContract();

  beforeAll(() => {
    setData(dataStart);
  });

  test('should not throw errors if no index is specified', async () => {
    const spec = getMockedSpec({
      data: {},
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`Array []`);
  });

  test('should extract single index pattern', async () => {
    const spec = getMockedSpec({
      data: {
        url: {
          index: 'test',
        },
      },
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test",
          "title": "test",
        },
      ]
    `);
  });

  test('should extract multiple index patterns', async () => {
    const spec = getMockedSpec({
      data: [
        {
          url: {
            index: 'test1',
          },
        },
        {
          url: {
            index: 'test2',
          },
        },
      ],
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "test1",
          "title": "test1",
        },
        Object {
          "id": "test2",
          "title": "test2",
        },
      ]
    `);
  });

  test('should filter empty values', async () => {
    const spec = getMockedSpec({
      data: [
        {
          url: {
            wrong: 'wrong',
          },
        },
        {
          url: {
            index: 'ok',
          },
        },
      ],
    });

    const indexes = await extractIndexPatternsFromSpec(spec);

    expect(indexes).toMatchInlineSnapshot(`
      Array [
        Object {
          "id": "ok",
          "title": "ok",
        },
      ]
    `);
  });
});
