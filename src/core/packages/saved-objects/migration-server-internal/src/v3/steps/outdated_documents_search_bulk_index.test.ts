/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runStep } from '../types';
import { SERVERLESS_INPUTS, createTestContext } from '../test_helpers/context';
import { createIOStub } from '../test_helpers/io';
import { pitState } from '../test_helpers/state';
import * as BULK_INDEX from './outdated_documents_search_bulk_index';

describe('OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX', () => {
  const context = createTestContext({ migrationConfig: { retryAttempts: 2 } });
  const state: BULK_INDEX.State = {
    ...pitState(context),
    controlState: BULK_INDEX.Name,
    bulkOperationBatches: [[{ delete: { _id: 'foo:1' } }], [{ delete: { _id: 'foo:2' } }]],
    currentBatch: 0,
    hasTransformedDocs: true,
  };

  it('indexes the batches one after the other, then reads the next documents', async () => {
    const io = createIOStub(context);
    const second = await runStep(BULK_INDEX.step(state, io, context));
    expect(second).toMatchObject({ controlState: BULK_INDEX.Name, currentBatch: 1 });

    const read = await runStep(BULK_INDEX.step({ ...state, currentBatch: 1 }, io, context));
    expect(read.controlState).toBe('OUTDATED_DOCUMENTS_SEARCH_READ');
    expect(read).not.toHaveProperty('bulkOperationBatches');
    expect(io.bulkIndex.mock.calls.map(([, operations]) => operations)).toEqual(
      state.bulkOperationBatches
    );
  });

  it('waits for unavailable shards, without using the retry budget', async () => {
    const io = createIOStub(context);
    io.bulkIndex.mockResolvedValue({ type: 'unavailable_shards_exception', message: 'no shards' });

    const next = await runStep(BULK_INDEX.step({ ...state, pollCount: 5 }, io, context));
    expect(next).toMatchObject({ controlState: BULK_INDEX.Name, retryCount: 0, pollCount: 6 });
  });

  it('only explains the shard allocation on the first attempt, and never on serverless', async () => {
    const io = createIOStub(context);
    await runStep(BULK_INDEX.step(state, io, context));
    await runStep(BULK_INDEX.step({ ...state, retryCount: 1 }, io, context));
    await runStep(BULK_INDEX.step({ ...state, pollCount: 1 }, io, context));

    const serverless = createTestContext({ inputs: SERVERLESS_INPUTS });
    await runStep(BULK_INDEX.step(state, io, serverless));

    expect(io.bulkIndex.mock.calls.map(([, , explain]) => explain)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it('fails when the index has a write block', async () => {
    const io = createIOStub(context);
    io.bulkIndex.mockResolvedValue({ type: 'target_index_had_write_block' });

    const next = await runStep(BULK_INDEX.step(state, io, context));
    expect(next).toMatchObject({
      controlState: 'FATAL',
      reason: 'The .kibana_1 index has a write block.',
    });
  });
});
