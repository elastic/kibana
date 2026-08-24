/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../../..';
import { getPaginationConfig } from './get_pagination_config';

const params = {
  context: {} as never,
  toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
};

describe('getPaginationConfig (logs)', () => {
  it('returns singlePage pagination mode', () => {
    const result = getPaginationConfig!(() => ({ paginationMode: 'multiPage' as const }), params)();

    expect(result.paginationMode).toBe('singlePage');
  });

  it('merges keys from prev() through and always enforces singlePage', () => {
    const prev = () => ({ paginationMode: 'multiPage' as const, extraKey: 'extra' });
    const result = getPaginationConfig!(prev, params)() as ReturnType<typeof prev> & {
      paginationMode: string;
    };

    // singlePage always wins regardless of what prev returned.
    expect(result.paginationMode).toBe('singlePage');
    // Other keys from prev are preserved.
    expect(result.extraKey).toBe('extra');
  });
});
