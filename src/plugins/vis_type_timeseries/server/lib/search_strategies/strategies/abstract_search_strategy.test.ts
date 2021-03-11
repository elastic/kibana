/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IndexPatternsService } from '../../../../../data/common';

import { from } from 'rxjs';
import { AbstractSearchStrategy, toSanitizedFieldType } from './abstract_search_strategy';
import type { IFieldType } from '../../../../../data/common';
import type { FieldSpec, RuntimeField } from '../../../../../data/common';
import {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../../types';

class FooSearchStrategy extends AbstractSearchStrategy {}

describe('AbstractSearchStrategy', () => {
  let abstractSearchStrategy: AbstractSearchStrategy;
  let mockedFields: IFieldType[];
  let indexPattern: string;
  let requestContext: VisTypeTimeseriesRequestHandlerContext;

  beforeEach(() => {
    mockedFields = [];
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
    abstractSearchStrategy = new FooSearchStrategy();
  });

  test('should init an AbstractSearchStrategy instance', () => {
    expect(abstractSearchStrategy.search).toBeDefined();
    expect(abstractSearchStrategy.getFieldsForWildcard).toBeDefined();
    expect(abstractSearchStrategy.checkForViability).toBeDefined();
  });

  test('should return fields for wildcard', async () => {
    const fields = await abstractSearchStrategy.getFieldsForWildcard(indexPattern, ({
      getDefault: jest.fn(),
      getFieldsForWildcard: jest.fn(() => Promise.resolve(mockedFields)),
    } as unknown) as IndexPatternsService);

    expect(fields).toEqual(mockedFields);
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
      expect(toSanitizedFieldType(fields)).toMatchInlineSnapshot(`Array []`);
    });
  });
});
