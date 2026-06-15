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
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import { BULK_UPDATE_CHUNK_SIZE, bulkUpdate } from './bulk_update_service';
import { LOOKUP_INDEX_UPDATE_ROUTE } from '@kbn/esql-types';
import { times } from 'lodash';

const INDEX_NAME = 'my-index';

describe('Bulk update', () => {
  let http: HttpStart;

  beforeEach(() => {
    jest.clearAllMocks();
    http = httpServiceMock.createStartContract();
    (http.post as jest.Mock).mockResolvedValue({
      errors: false,
      items: [],
      took: 0,
    });
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
    const deletes = operations.filter((op) => op!.delete);
    const deleteIds = deletes.map((d) => d!.delete!._id).sort();
    expect(deleteIds).toEqual(['abc123', 'to-del']);

    // Validate there is an index operation and that the document merges values
    const indexIdx = operations.findIndex((op) => op!.index);
    expect(indexIdx).toBeGreaterThanOrEqual(0);
    const doc = operations[indexIdx + 1]!;
    expect(doc).toEqual({ b: 2, c: 3 });
  });

  it('un-flattens dotted field names into nested objects', async () => {
    const updates = [
      {
        type: 'add-doc' as const,
        payload: { id: '1', value: { 'parent.child': 'test' } },
      },
      {
        type: 'add-doc' as const,
        payload: {
          id: '2',
          value: {
            'parent.child.grandchild': 'test-grandchild',
            'parent.child.grandchild2': 'test-grandchild2',
            'parent.child2': 'test-child-2',
          },
        },
      },
    ];

    await bulkUpdate(INDEX_NAME, updates, http);

    const [, options] = (http.post as jest.Mock).mock.calls[0];
    const { operations } = JSON.parse(options.body);

    expect(operations).toEqual([
      { update: { _id: '1' } },
      { doc: { parent: { child: 'test' } } },
      { update: { _id: '2' } },
      {
        doc: {
          parent: {
            child: {
              grandchild: 'test-grandchild',
              grandchild2: 'test-grandchild2',
            },
            child2: 'test-child-2',
          },
        },
      },
    ]);
  });

  it('should split operations into chunks of 500 update items', async () => {
    const UPDATES_COUNT = 800;
    const updates = times(UPDATES_COUNT, (i) => ({
      type: 'add-doc' as const,
      payload: { id: `doc-${i}`, value: { field: 'value' } },
    }));

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
