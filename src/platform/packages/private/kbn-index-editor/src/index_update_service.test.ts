/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ROW_PLACEHOLDER_PREFIX } from './constants';
import { IndexUpdateService } from './index_update_service';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';

describe('IndexUpdateService', () => {
  let http: HttpStart;
  let data: DataPublicPluginStart;
  let service: IndexUpdateService;
  let notifications: NotificationsStart;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    data = dataPluginMock.createStartContract();
    notifications = notificationServiceMock.createStartContract();

    service = new IndexUpdateService(http, data, notifications, true);
  });

  afterEach(() => {
    service.destroy();
    jest.clearAllMocks();
  });

  describe('ESQL query', () => {
    it('emits ESQL query with metadata once the index is created', async () => {
      service.setIndexName('my-index');
      service.setIndexCreated(true);
      service.setQstr('200');
      service.setSort([['@timestamp' as any, 'desc']]);

      const query = await firstValueFrom(service.esqlQuery$);

      expect(query.toLowerCase()).toBe(
        'from "my-index" metadata _id, _source | where qstr("*200*") | limit 1000 | sort @timestamp desc'
      );
    });

    it('emits Discover ESQL query without metadata', async () => {
      service.setIndexName('logs-*');
      service.setQstr('ERROR');

      const query = await firstValueFrom(service.esqlDiscoverQuery$);

      expect(query).toBe('FROM "logs-*" | WHERE QSTR("*ERROR*") | LIMIT 1000');
    });
  });

  describe('Unsaved changes', () => {
    it('marks unsaved changes after adding a new row', async () => {
      const initial = await firstValueFrom(service.hasUnsavedChanges$);
      expect(initial).toBe(false);

      service.addEmptyRow();

      const afterAdd = await firstValueFrom(service.hasUnsavedChanges$);
      expect(afterAdd).toBe(true);
    });

    it('marks unsaved changes after updating a doc', async () => {
      const initial = await firstValueFrom(service.hasUnsavedChanges$);
      expect(initial).toBe(false);

      service.updateDoc('1', { a: 'b' });

      const afterAdd = await firstValueFrom(service.hasUnsavedChanges$);
      expect(afterAdd).toBe(true);
    });

    it('does not mark unsaved changes if the only change is adding a new column', async () => {
      const initial = await firstValueFrom(service.hasUnsavedChanges$);
      expect(initial).toBe(false);

      service.addNewColumn();

      const afterAdd = await firstValueFrom(service.hasUnsavedChanges$);
      expect(afterAdd).toBe(false);
    });

    it('does not mark unsaved changes if the only change is deleting a placeholder row', async () => {
      const initial = await firstValueFrom(service.hasUnsavedChanges$);
      expect(initial).toBe(false);

      service.addEmptyRow();
      const placeholderRow = (await firstValueFrom(service.rows$))[0];

      service.deleteDoc([placeholderRow.id]);

      const afterAdd = await firstValueFrom(service.hasUnsavedChanges$);
      expect(afterAdd).toBe(false);
    });
  });

  describe('Bulk update', () => {
    it('builds bulk update operations correctly and posts to the correct endpoint', async () => {
      service.setIndexName('my-index');

      const updates = [
        {
          type: 'add-doc',
          payload: { id: `${ROW_PLACEHOLDER_PREFIX}xyz`, value: { b: 2 } },
        },
        {
          type: 'add-doc',
          payload: { id: `${ROW_PLACEHOLDER_PREFIX}xyz`, value: { c: 3 } },
        },
        {
          type: 'delete-doc',
          payload: { ids: ['abc123', 'to-del'] },
        },
      ] as any;

      // mock success response
      (http.post as jest.Mock).mockResolvedValue({
        errors: false,
        items: [],
        took: 0,
      } satisfies BulkResponse);

      await service.bulkUpdate(updates);

      expect(http.post).toHaveBeenCalledTimes(1);
      const [url, options] = (http.post as jest.Mock).mock.calls[0];
      expect(url).toBe('/internal/esql/lookup_index/my-index/update');

      const body = JSON.parse(options.body);
      expect(Array.isArray(body.operations)).toBe(true);

      // We expect: 1 index operation (2 entries: action + source) and 2 delete ops (each is a single entry)
      // So total flattened entries = 4
      expect(body.operations.length).toBe(4);

      // Validate presence of delete operations for non-placeholder ids only
      const deletes = body.operations.filter((op: any) => op.delete);
      const deleteIds = deletes.map((d: any) => d.delete._id).sort();
      expect(deleteIds).toEqual(['abc123', 'to-del']);

      // Validate there is an index operation and that the document merges values
      const indexIdx = body.operations.findIndex((op: any) => op.index);
      expect(indexIdx).toBeGreaterThanOrEqual(0);
      const doc = body.operations[indexIdx + 1];
      expect(doc).toEqual({ b: 2, c: 3 });
    });

    it('throws when calling bulkUpdate with empty operations', async () => {
      service.setIndexName('idx');
      await expect(service.bulkUpdate([] as any)).rejects.toThrow('empty operations');
    });
  });

  it('Handles rows successive modifications in a correct manner', async () => {
    service.addEmptyRow();
    const rows = await firstValueFrom(service.rows$);
    expect(rows.length).toBe(1);
    expect(rows[0].raw).toEqual({});

    service.updateDoc(rows[0].id, { foo: 'bar' });
    service.updateDoc(rows[0].id, { foo2: 'bar2' });

    const rowsAfterEdition = await firstValueFrom(service.rows$);
    expect(rowsAfterEdition.length).toBe(1);
    expect(rowsAfterEdition[0].raw).toEqual({ foo: 'bar', foo2: 'bar2' });

    service.deleteDoc([rowsAfterEdition[0].id]);
    const rowsAfterDeletion = await firstValueFrom(service.rows$);
    expect(rowsAfterDeletion.length).toBe(1); // An empty placeholder row should always be visible
    expect(rowsAfterDeletion[0].raw).toMatchObject({ _id: expect.anything() });
  });
});
