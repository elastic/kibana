/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLCallbacks, ESQLFieldWithMetadata } from '@kbn/esql-types';
import { validateQuery } from '../language/validation/validation';

const columns: ESQLFieldWithMetadata[] = [{ name: 'message', type: 'keyword', userDefined: false }];

const createCallbacks = () => {
  const getColumnsFor = jest.fn<ReturnType<NonNullable<ESQLCallbacks['getColumnsFor']>>, []>();
  getColumnsFor.mockResolvedValue(columns);
  return { getColumnsFor };
};

describe('QueryColumns request cache', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deduplicates column retrieval within one validation', async () => {
    const callbacks = createCallbacks();
    const query = 'FROM request_cache | EVAL copy = message | WHERE copy == "ok"';

    await validateQuery(query, callbacks);

    expect(callbacks.getColumnsFor).toHaveBeenCalledTimes(1);
  });

  it('does not share column metadata between validations', async () => {
    const callbacks = createCallbacks();
    const query = 'FROM isolated_cache | EVAL copy = message | WHERE copy == "ok"';

    await validateQuery(query, callbacks);
    await validateQuery(query, callbacks);

    expect(callbacks.getColumnsFor).toHaveBeenCalledTimes(2);
  });

  it('preserves cache invalidation within a validation', async () => {
    const callbacks = createCallbacks();
    const query = 'FROM cache_invalidation | EVAL copy = message | WHERE copy == "ok"';

    await validateQuery(query, callbacks, { invalidateColumnsCache: true });

    expect(callbacks.getColumnsFor).toHaveBeenCalledTimes(2);
  });
});
