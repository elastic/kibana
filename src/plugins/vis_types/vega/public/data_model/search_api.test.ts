/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extendSearchParamsWithRuntimeFields } from './search_api';
import { dataPluginMock } from '../../../../data/public/mocks';

import { getSearchParamsFromRequest, DataPublicPluginStart } from '../../../../data/public';

const mockComputedFields = (
  dataStart: DataPublicPluginStart,
  index: string,
  runtimeFields: Record<string, unknown>
) => {
  dataStart.indexPatterns.find = jest.fn().mockReturnValue([
    {
      title: index,
      getComputedFields: () => ({
        runtimeFields,
      }),
      getRuntimeMappings: () => runtimeFields,
    },
  ]);
};

describe('extendSearchParamsWithRuntimeFields', () => {
  let dataStart: DataPublicPluginStart;

  beforeEach(() => {
    dataStart = dataPluginMock.createStartContract();
  });

  test('should inject default runtime_mappings for known indexes', async () => {
    const requestParams = {};
    const runtimeFields = { foo: {} };

    mockComputedFields(dataStart, 'index', runtimeFields);

    expect(
      await extendSearchParamsWithRuntimeFields(dataStart.indexPatterns, requestParams, 'index')
    ).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "runtime_mappings": Object {
            "foo": Object {},
          },
        },
      }
    `);
  });

  test('should use runtime mappings from spec if it is specified', async () => {
    const requestParams = {
      body: {
        runtime_mappings: {
          test: {},
        },
      },
    } as unknown as ReturnType<typeof getSearchParamsFromRequest>;
    const runtimeFields = { foo: {} };

    mockComputedFields(dataStart, 'index', runtimeFields);

    expect(
      await extendSearchParamsWithRuntimeFields(dataStart.indexPatterns, requestParams, 'index')
    ).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "runtime_mappings": Object {
            "test": Object {},
          },
        },
      }
    `);
  });
});
