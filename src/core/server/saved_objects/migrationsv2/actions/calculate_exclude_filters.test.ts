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
    const hook1 = jest.fn().mockReturnValue({ bool: { must: { term: { fieldA: '123' } } } });
    const hook2 = jest.fn().mockResolvedValue({ bool: { must: { term: { fieldB: 'abc' } } } });

    const task = calculateExcludeFilters({
      client,
      excludeFromUpgradeFilterHooks: { type1: hook1, type2: hook2 },
    });
    const result = await task();

    expect(hook1).toHaveBeenCalledWith({ readonlyEsClient: { search: expect.any(Function) } });
    expect(hook2).toHaveBeenCalledWith({ readonlyEsClient: { search: expect.any(Function) } });
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
      errorsByType: {},
    });
  });

  it('ignores hooks that return non-retryable errors', async () => {
    const error = new Error('blah!');
    const hook1 = jest.fn().mockRejectedValue(error);
    const hook2 = jest.fn().mockResolvedValue({ bool: { must: { term: { fieldB: 'abc' } } } });

    const task = calculateExcludeFilters({
      client,
      excludeFromUpgradeFilterHooks: { type1: hook1, type2: hook2 },
    });
    const result = await task();

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual({
      excludeFilter: {
        bool: {
          must_not: [{ bool: { must: { term: { fieldB: 'abc' } } } }],
        },
      },
      errorsByType: { type1: error },
    });
  });

  it('returns Either.Left if a hook returns a retryable error', async () => {
    const error = new esErrors.NoLivingConnectionsError(
      'reason',
      elasticsearchClientMock.createApiResponse()
    );
    const hook1 = jest.fn().mockRejectedValue(error);
    const hook2 = jest.fn().mockResolvedValue({ bool: { must: { term: { fieldB: 'abc' } } } });

    const task = calculateExcludeFilters({
      client,
      excludeFromUpgradeFilterHooks: { type1: hook1, type2: hook2 },
    });
    const result = await task();

    expect(Either.isLeft(result)).toBe(true);
    expect((result as Either.Left<any>).left).toEqual({
      type: 'retryable_es_client_error',
      message: 'reason',
      error,
    });
  });

  it('ignores and returns errors for hooks that take longer than timeout', async () => {
    const hook1 = jest.fn().mockReturnValue(new Promise((r) => setTimeout(r, 40_000)));
    const hook2 = jest.fn().mockResolvedValue({ bool: { must: { term: { fieldB: 'abc' } } } });

    const task = calculateExcludeFilters({
      client,
      excludeFromUpgradeFilterHooks: { type1: hook1, type2: hook2 },
      hookTimeoutMs: 100,
    });
    const resultPromise = task();
    await new Promise((r) => setTimeout(r, 110));
    const result = await resultPromise;

    expect(Either.isRight(result)).toBe(true);
    expect((result as Either.Right<any>).right).toEqual({
      excludeFilter: {
        bool: {
          must_not: [{ bool: { must: { term: { fieldB: 'abc' } } } }],
        },
      },
      errorsByType: expect.any(Object),
    });
    expect((result as Either.Right<any>).right.errorsByType.type1.toString()).toMatchInlineSnapshot(
      `"Error: excludeFromUpgrade hook timed out after 0.1 seconds."`
    );
  });
});
