/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { scopedEsClient } from './assemble_engine_loop';
import { ScopedEs } from './scoped_es';

describe('ScopedEs', () => {
  it('forwards requests and rejects oversized responses before returning', async () => {
    const request = jest.fn().mockResolvedValue({ hits: { hits: [{ value: 'x' }] } });
    const scopedEs = new ScopedEs(
      () => ({ transport: { request } } as unknown as ElasticsearchClient),
      10
    );

    await expect(
      scopedEs.request({ scopeId: 'scope-1', method: 'GET', path: '/_search' })
    ).rejects.toMatchObject({
      type: 'StepSizeLimitExceeded',
    });
    expect(request).toHaveBeenCalledWith(
      { method: 'GET', path: '/_search' },
      { maxResponseSize: 10 }
    );
  });

  it('blocks ambient client properties outside transport.request', () => {
    const client = scopedEsClient({ request: jest.fn() }, 'scope-1');
    expect(() => (client as unknown as { indices: unknown }).indices).toThrow(
      'Elasticsearch calls from the worker must go through a coordinator capability'
    );
    expect(() => (client.transport as unknown as { close: unknown }).close).toThrow(
      'Elasticsearch calls from the worker must go through a coordinator capability'
    );
  });
});
