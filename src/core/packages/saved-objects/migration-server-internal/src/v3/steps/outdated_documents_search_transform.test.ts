/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import { runStep } from '../types';
import { createTestContext } from '../test_helpers/context';
import { createIOStub, success } from '../test_helpers/io';
import { pitState } from '../test_helpers/state';
import * as TRANSFORM from './outdated_documents_search_transform';

describe('OUTDATED_DOCUMENTS_SEARCH_TRANSFORM', () => {
  const context = createTestContext();

  const rawDoc = (id: string, originId?: string): SavedObjectsRawDoc => ({
    _id: id,
    _seq_no: 7,
    _primary_term: 1,
    _source: { type: 'foo', foo: {}, references: [], ...(originId && { originId }) },
  });

  const transform = async (read: SavedObjectsRawDoc[], processedDocs: SavedObjectsRawDoc[]) => {
    const io = createIOStub(context);
    io.transformDocs.mockResolvedValue(success({ processedDocs }));
    const state: TRANSFORM.State = {
      ...pitState(context),
      controlState: TRANSFORM.Name,
      outdatedDocuments: read,
    };
    return runStep(TRANSFORM.step(state, io, context));
  };

  it('only overwrites the documents that have not changed since they were read', async () => {
    // copied documents keep the originId of their source
    const copied = rawDoc('foo:copy', 'source');

    const next = await transform([copied], [copied]);

    expect(next.controlState).toBe('OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX');
    expect('bulkOperationBatches' in next && next.bulkOperationBatches).toEqual([
      [[{ index: { _id: 'foo:copy', if_seq_no: 7, if_primary_term: 1 } }, copied._source]],
    ]);
  });

  it('writes the documents whose id changed unconditionally', async () => {
    const converted = rawDoc('foo:new-id', 'old-id');

    const next = await transform([rawDoc('foo:old-id')], [converted]);

    expect('bulkOperationBatches' in next && next.bulkOperationBatches).toEqual([
      [[{ index: { _id: 'foo:new-id' } }, converted._source]],
    ]);
  });
});
