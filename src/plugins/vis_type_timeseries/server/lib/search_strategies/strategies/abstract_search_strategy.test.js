/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { from } from 'rxjs';
import { AbstractSearchStrategy } from './abstract_search_strategy';

describe('AbstractSearchStrategy', () => {
  let abstractSearchStrategy;
  let req;
  let mockedFields;
  let indexPattern;

  beforeEach(() => {
    mockedFields = {};
    req = {
      payload: {},
      pre: {
        indexPatternsService: {
          getFieldsForWildcard: jest.fn().mockReturnValue(mockedFields),
        },
      },
    };

    abstractSearchStrategy = new AbstractSearchStrategy();
  });

  test('should init an AbstractSearchStrategy instance', () => {
    expect(abstractSearchStrategy.search).toBeDefined();
    expect(abstractSearchStrategy.getFieldsForWildcard).toBeDefined();
    expect(abstractSearchStrategy.checkForViability).toBeDefined();
  });

  test('should return fields for wildcard', async () => {
    const fields = await abstractSearchStrategy.getFieldsForWildcard(req, indexPattern);

    expect(fields).toBe(mockedFields);
    expect(req.pre.indexPatternsService.getFieldsForWildcard).toHaveBeenCalledWith({
      pattern: indexPattern,
      fieldCapsOptions: { allow_no_indices: true },
    });
  });

  test('should return response', async () => {
    const searches = [{ body: 'body', index: 'index' }];
    const searchFn = jest.fn().mockReturnValue(from(Promise.resolve({})));

    const responses = await abstractSearchStrategy.search(
      {
        payload: {
          sessionId: 1,
        },
        requestContext: {
          search: { search: searchFn },
        },
      },
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
        sessionId: 1,
      }
    );
  });
});
