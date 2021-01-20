/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
