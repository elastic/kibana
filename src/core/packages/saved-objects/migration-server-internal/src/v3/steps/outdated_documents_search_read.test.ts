/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runStep } from '../types';
import { createTestContext } from '../test_helpers/context';
import { createIOStub } from '../test_helpers/io';
import { pitState } from '../test_helpers/state';
import * as READ from './outdated_documents_search_read';

describe('OUTDATED_DOCUMENTS_SEARCH_READ', () => {
  const context = createTestContext({ migrationConfig: { batchSize: 10 } });
  const state: READ.State = { ...pitState(context), controlState: READ.Name };
  const tooLarge = { type: 'es_response_too_large' as const, contentLength: 2e6 };

  it('halves the batch size when the response is too large', async () => {
    const io = createIOStub(context);
    io.readWithPit.mockReset().mockResolvedValue(tooLarge);

    const next = await runStep(READ.step(state, io, context));
    expect(next).toMatchObject({ controlState: READ.Name, batchSize: 5 });
    expect(next.logs).toEqual([
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('reducing the batch size in half to 5'),
      }),
    ]);
  });

  it('fails when a single document is too large', async () => {
    const io = createIOStub(context);
    io.readWithPit.mockReset().mockResolvedValue(tooLarge);

    const next = await runStep(READ.step({ ...state, batchSize: 1 }, io, context));
    expect(next).toMatchObject({
      controlState: 'FATAL',
      reason: expect.stringContaining('After reducing the read batch size to a single document'),
    });
  });

  it('closes the point-in-time once all documents have been read', async () => {
    const next = await runStep(READ.step(state, createIOStub(context), context));
    expect(next.controlState).toBe('OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT');
  });
});
