/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { from } from 'rxjs';
import { AbstractSearchStrategy, ReqFacade } from './abstract_search_strategy';
import type { VisPayload } from '../../../../common/types';
import type { IFieldType } from '../../../../../data/common';

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
});
