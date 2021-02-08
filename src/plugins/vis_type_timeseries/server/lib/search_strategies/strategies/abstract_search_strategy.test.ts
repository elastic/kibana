/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from } from 'rxjs';
import {
  AbstractSearchStrategy,
  ReqFacade,
  toSanitizedFieldType,
} from './abstract_search_strategy';
import type { VisPayload } from '../../../../common/types';
import type { IFieldType } from '../../../../../data/common';
import type { FieldSpec, RuntimeField } from '../../../../../data/common';

class FooSearchStrategy extends AbstractSearchStrategy {}

describe('AbstractSearchStrategy', () => {
  let abstractSearchStrategy: AbstractSearchStrategy;
  let req: ReqFacade;
  let mockedFields: IFieldType[];
  let indexPattern: string;

  beforeEach(() => {
    mockedFields = [];
    req = ({
      payload: {},
      pre: {
        indexPatternsFetcher: {
          getFieldsForWildcard: jest.fn().mockReturnValue(mockedFields),
        },
      },
      getIndexPatternsService: jest.fn(() =>
        Promise.resolve({
          find: jest.fn(() => []),
        })
      ),
    } as unknown) as ReqFacade<VisPayload>;

    abstractSearchStrategy = new FooSearchStrategy();
  });

  test('should init an AbstractSearchStrategy instance', () => {
    expect(abstractSearchStrategy.search).toBeDefined();
    expect(abstractSearchStrategy.getFieldsForWildcard).toBeDefined();
    expect(abstractSearchStrategy.checkForViability).toBeDefined();
  });

  test('should return fields for wildcard', async () => {
    const fields = await abstractSearchStrategy.getFieldsForWildcard(req, indexPattern);

    expect(fields).toEqual(mockedFields);
    expect(req.pre.indexPatternsFetcher!.getFieldsForWildcard).toHaveBeenCalledWith({
      pattern: indexPattern,
      metaFields: [],
      fieldCapsOptions: { allow_no_indices: true },
    });
  });

  test('should return response', async () => {
    const searches = [{ body: 'body', index: 'index' }];
    const searchFn = jest.fn().mockReturnValue(from(Promise.resolve({})));

    const responses = await abstractSearchStrategy.search(
      ({
        payload: {
          searchSession: {
            sessionId: '1',
            isRestore: false,
            isStored: true,
          },
        },
        requestContext: {
          search: { search: searchFn },
        },
      } as unknown) as ReqFacade<VisPayload>,
      searches
    );

    expect(responses).toEqual([{}]);
    expect(searchFn).toHaveBeenCalledWith(
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
