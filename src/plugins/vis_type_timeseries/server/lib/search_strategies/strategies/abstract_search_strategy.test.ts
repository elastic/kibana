/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const mockGetFieldsForWildcard = jest.fn(() => []);

jest.mock('../../../../../data/server', () => ({
  indexPatterns: {
    isNestedField: jest.fn(() => false),
  },
  IndexPatternsFetcher: jest.fn().mockImplementation(() => ({
    getFieldsForWildcard: mockGetFieldsForWildcard,
  })),
}));

import { from } from 'rxjs';
import { AbstractSearchStrategy, toSanitizedFieldType } from './abstract_search_strategy';
import type { IFieldType } from '../../../../../data/common';
import type { FieldSpec, RuntimeField } from '../../../../../data/common';
import {
  VisTypeTimeseriesRequest,
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';
import { Framework } from '../../../plugin';
import { indexPatterns } from '../../../../../data/server';

class FooSearchStrategy extends AbstractSearchStrategy {}

describe('AbstractSearchStrategy', () => {
  let abstractSearchStrategy: AbstractSearchStrategy;
  let mockedFields: IFieldType[];
  let indexPattern: string;
  let requestContext: VisTypeTimeseriesRequestHandlerContext;
  let framework: Framework;

  beforeEach(() => {
    mockedFields = [];
    framework = ({
      getIndexPatternsService: jest.fn(() =>
        Promise.resolve({
          find: jest.fn(() => []),
          getDefault: jest.fn(() => {}),
        })
      ),
    } as unknown) as Framework;
    requestContext = ({
      core: {
        elasticsearch: {
          client: {
            asCurrentUser: jest.fn(),
          },
        },
      },
      search: {
        search: jest.fn().mockReturnValue(from(Promise.resolve({}))),
      },
    } as unknown) as VisTypeTimeseriesRequestHandlerContext;
    abstractSearchStrategy = new FooSearchStrategy(framework);
  });

  test('should init an AbstractSearchStrategy instance', () => {
    expect(abstractSearchStrategy.search).toBeDefined();
    expect(abstractSearchStrategy.getFieldsForWildcard).toBeDefined();
    expect(abstractSearchStrategy.checkForViability).toBeDefined();
  });

  test('should return fields for wildcard', async () => {
    const fields = await abstractSearchStrategy.getFieldsForWildcard(
      requestContext,
      {} as VisTypeTimeseriesRequest,
      indexPattern
    );

    expect(fields).toEqual(mockedFields);
    expect(mockGetFieldsForWildcard).toHaveBeenCalledWith({
      pattern: indexPattern,
      metaFields: [],
      fieldCapsOptions: { allow_no_indices: true },
    });
  });

  test('should return response', async () => {
    const searches = [{ body: 'body', index: 'index' }];

    const responses = await abstractSearchStrategy.search(
      requestContext,
      ({
        body: {
          searchSession: {
            sessionId: '1',
            isRestore: false,
            isStored: true,
          },
        },
      } as unknown) as VisTypeTimeseriesVisDataRequest,
      searches
    );

    expect(responses).toEqual([{}]);
    expect(requestContext.search.search).toHaveBeenCalledWith(
      {
        params: {
          body: 'body',
          index: 'index',
        },
        indexType: undefined,
      },
      {
        sessionId: '1',
        isRestore: false,
        isStored: true,
      }
    );
  });

  describe('toSanitizedFieldType', () => {
    const mockedField = {
      lang: 'lang',
      conflictDescriptions: {},
      aggregatable: true,
      name: 'name',
      type: 'type',
      esTypes: ['long', 'geo'],
    } as FieldSpec;

    test('should sanitize fields ', async () => {
      const fields = [mockedField] as FieldSpec[];

      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`
        Array [
          Object {
            "label": "name",
            "name": "name",
            "type": "type",
          },
        ]
      `);
    });

    test('should filter runtime fields', async () => {
      const fields: FieldSpec[] = [
        {
          ...mockedField,
          runtimeField: {} as RuntimeField,
        },
      ];

      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`Array []`);
    });

    test('should filter non-aggregatable fields', async () => {
      const fields: FieldSpec[] = [
        {
          ...mockedField,
          aggregatable: false,
        },
      ];

      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`Array []`);
    });

    test('should filter nested fields', async () => {
      const fields: FieldSpec[] = [
        {
          ...mockedField,
          subType: {
            nested: {
              path: 'path',
            },
          },
        },
      ];
      // @ts-expect-error
      indexPatterns.isNestedField.mockReturnValue(true);

      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`Array []`);
    });
  });
});
