/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { ROW_PLACEHOLDER_PREFIX } from '../constants';
import { httpServiceMock } from '@kbn/core/public/mocks';
import type { BulkOperationContainer, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { BULK_UPDATE_CHUNK_SIZE, bulkUpdate } from './bulk_update_service';
import { LOOKUP_INDEX_UPDATE_ROUTE } from '@kbn/esql-types';
import { times } from 'lodash';

const INDEX_NAME = 'my-index';

describe('Bulk update', () => {
  let http: HttpStart;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });
  it('builds bulk update operations correctly and posts to the correct endpoint', async () => {
    const updates = [
      {
        type: 'add-doc' as const,
        payload: { id: `${ROW_PLACEHOLDER_PREFIX}xyz`, value: { b: 2 } },
      },
      {
        type: 'add-doc' as const,
        payload: { id: `${ROW_PLACEHOLDER_PREFIX}xyz`, value: { c: 3 } },
      },
      {
        type: 'delete-doc' as const,
        payload: { ids: ['abc123', 'to-del'] },
      },
    ];

    // mock success response
    (http.post as jest.Mock).mockResolvedValue({
      errors: false,
      items: [],
      took: 0,
    } satisfies BulkResponse);

    await bulkUpdate(INDEX_NAME, updates, http);

    expect(http.post).toHaveBeenCalledTimes(1);
    const [url, options] = (http.post as jest.Mock).mock.calls[0];
    expect(url).toBe(`${LOOKUP_INDEX_UPDATE_ROUTE}/my-index`);

    const body = JSON.parse(options.body);
    const operations: BulkOperationContainer[] = body.operations;
    expect(Array.isArray(operations)).toBe(true);

    // We expect: 1 index operation (2 entries: action + source) and 2 delete ops (each is a single entry)
    // So total flattened entries = 4
    expect(operations.length).toBe(4);

    // Validate presence of delete operations for non-placeholder ids only
    const deletes = operations.filter((op) => op.delete);
    const deleteIds = deletes.map((d) => d.delete?._id).sort();
    expect(deleteIds).toEqual(['abc123', 'to-del']);

    // Validate there is an index operation and that the document merges values
    const indexIdx = operations.findIndex((op) => op.index);
    expect(indexIdx).toBeGreaterThanOrEqual(0);
    const doc = operations[indexIdx + 1];
    expect(doc).toEqual({ b: 2, c: 3 });
  });

  it('should split operations into chunks of 500 update items', async () => {
    const UPDATES_COUNT = 800;
    const updates = times(UPDATES_COUNT, (i) => ({
      type: 'add-doc' as const,
      payload: { id: `doc-${i}`, value: { field: 'value' } },
    }));

    (http.post as jest.Mock).mockResolvedValue({
      errors: false,
      items: [],
      took: 10,
    });

    await bulkUpdate(INDEX_NAME, updates, http);

    expect(http.post).toHaveBeenCalledTimes(2);

    // Verify first chunk
    const firstCallBody = JSON.parse((http.post as jest.Mock).mock.calls[0][1].body);
    expect(firstCallBody.operations.length).toBe(BULK_UPDATE_CHUNK_SIZE * 2); // Each update has 2 operations (index + doc)

    // Verify second chunk
    const secondCallBody = JSON.parse((http.post as jest.Mock).mock.calls[1][1].body);
    expect(secondCallBody.operations.length).toBe((UPDATES_COUNT - BULK_UPDATE_CHUNK_SIZE) * 2);
  });
});
