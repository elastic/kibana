/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Either from 'fp-ts/lib/Either';
import { errors as esErrors } from '@elastic/elasticsearch';
import { elasticsearchClientMock } from '../../../elasticsearch/client/mocks';
import { calculateExcludeFilters } from './calculate_exclude_filters';

describe('calculateExcludeFilters', () => {
  const client = elasticsearchClientMock.createInternalClient();

  it('calls each provided hook and returns combined filter', async () => {
    const hook1 = jest.fn().mockResolvedValue({ bool: { must: { term: { fieldA: '123' } } } });
    const hook2 = jest.fn().mockResolvedValue({ bool: { must: { term: { fieldB: 'abc' } } } });

    const task = calculateExcludeFilters({ client, excludeFromUpgradeFilterHooks: [hook1, hook2] });
    const result = await task();

    expect(hook1).toHaveBeenCalledWith(client);
    expect(hook2).toHaveBeenCalledWith(client);
    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual({
      excludeFilter: {
        bool: {
          must_not: [
            { bool: { must: { term: { fieldA: '123' } } } },
            { bool: { must: { term: { fieldB: 'abc' } } } },
          ],
        },
      },
      errors: [],
    });
  });

  it('ignores hooks that return non-retryable errors', async () => {
    const error = new Error('blah!');
    const hook1 = jest.fn().mockRejectedValue(error);
    const hook2 = jest.fn().mockResolvedValue({ bool: { must: { term: { fieldB: 'abc' } } } });

    const task = calculateExcludeFilters({ client, excludeFromUpgradeFilterHooks: [hook1, hook2] });
    const result = await task();

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual({
      excludeFilter: {
        bool: {
          must_not: [{ bool: { must: { term: { fieldB: 'abc' } } } }],
        },
      },
      errors: [error],
    });
  });

  it('returns Either.Left if a hook returns a retryable error', async () => {
    const error = new esErrors.NoLivingConnectionsError(
      'reason',
      elasticsearchClientMock.createApiResponse()
    );
    const hook1 = jest.fn().mockRejectedValue(error);
    const hook2 = jest.fn().mockResolvedValue({ bool: { must: { term: { fieldB: 'abc' } } } });

    const task = calculateExcludeFilters({ client, excludeFromUpgradeFilterHooks: [hook1, hook2] });
    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual({
      type: 'retryable_es_client_error',
      message: 'reason',
      error,
    });
  });
});
