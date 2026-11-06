/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';
import { filter, firstValueFrom, of } from 'rxjs';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ROW_PLACEHOLDER_PREFIX } from '../constants';
import { IndexUpdateService } from './index_update_service';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import {
  analyticsServiceMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import { IndexEditorTelemetryService } from '../telemetry/telemetry_service';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import {
  INDEX_EDITOR_CREATE_ROUTE,
  INDEX_EDITOR_RECREATE_ROUTE,
  INDEX_EDITOR_RESOLVE_ROUTE,
  type IndexEditorResolution,
} from '@kbn/esql-types';

jest.mock('@kbn/esql-utils', () => {
  const actual = jest.requireActual('@kbn/esql-utils');
  return {
    ...actual,
    getESQLAdHocDataview: jest.fn(),
  };
});

describe('IndexUpdateService', () => {
  let http: HttpStart;
  let data: DataPublicPluginStart;
  let service: IndexUpdateService;
  let notifications: NotificationsStart;
  let analytics: AnalyticsServiceStart;
  let indexEditorTelemetryService: IndexEditorTelemetryService;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    data = dataPluginMock.createStartContract();
    notifications = notificationServiceMock.createStartContract();
    analytics = analyticsServiceMock.createAnalyticsServiceStart();
    indexEditorTelemetryService = new IndexEditorTelemetryService(
      analytics,
      true,
      true,
      'esql_hover'
    );

    (getESQLAdHocDataview as jest.Mock).mockResolvedValue({
      fields: {
        getByName: () => {},
        create: () => ({}),
        concat: () => [],
      },
    });

    service = new IndexUpdateService(http, data, notifications, indexEditorTelemetryService, true);
  });

  afterEach(() => {
    service.destroy();
    jest.clearAllMocks();
  });

  describe('ESQL query', () => {
    it('emits ESQL query with metadata once the index is created', async () => {
      service.setIndexName('my-index');
      service.setIndexCreated(true);
      service.setFilterQuery({ query: '200', language: 'kuery' });
      service.setSort([['@timestamp' as any, 'desc']]);

      const query = await firstValueFrom(service.esqlQuery$);

      expect(query.toLowerCase()).toBe(
        'from "my-index" metadata _id, _source | where kql("200") | limit 5000 | sort @timestamp desc'
      );
    });

    it('emits Discover ESQL query without metadata', async () => {
      service.setIndexName('logs-*');
      service.setFilterQuery({ query: 'host.name: "test"', language: 'kuery' });

      const query = await firstValueFrom(service.esqlDiscoverQuery$);

      expect(query).toBe('FROM "logs-*" | WHERE KQL("host.name: \\"test\\"") | LIMIT 5000');
    });
  });

  describe('dataSource$', () => {
    it('emits the ES|QL source of the index with the table columns', async () => {
      (getESQLAdHocDataview as jest.Mock).mockResolvedValue({
        fields: {
          getByName: () => {},
          create: () => ({}),
          concat: () => [{ name: 'foo', type: 'string', esTypes: ['keyword'], spec: {} }],
        },
      });
      service.setIndexName('my-index');

      const dataSource = await firstValueFrom(service.dataSource$);

      expect(dataSource.query).toBe('FROM "my-index"');
      expect(dataSource.getColumns()).toEqual([
        expect.objectContaining({ name: 'foo', type: 'string', esType: 'keyword' }),
      ]);
    });
  });

  describe('Unsaved changes', () => {
    it('unsaved changes should be false after adding a new empty row', async () => {
      const initial = await firstValueFrom(service.hasUnsavedChanges$);
      expect(initial).toBe(false);

      service.addEmptyRow(1);

      const afterAdd = await firstValueFrom(service.hasUnsavedChanges$);
      expect(afterAdd).toBe(false);
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

      service.addNewColumn('column1', 'keyword');

      const afterAdd = await firstValueFrom(service.hasUnsavedChanges$);
      expect(afterAdd).toBe(false);
    });

    it('clears unsaved changes when an edited value is reverted to its original', async () => {
      // Seed a fetched document so edits can be compared against the stored value
      const docsSubject = (service as unknown as { _docs$: BehaviorSubject<DataTableRecord[]> })
        ._docs$;
      docsSubject.next([
        { id: '1', raw: { name: 'Boris' }, flattened: { name: 'Boris' } } as DataTableRecord,
      ]);

      // Editing the value to something new marks the doc as dirty
      service.updateDoc('1', { name: 'DBoris' });
      expect(await firstValueFrom(service.hasUnsavedChanges$)).toBe(true);
      expect(service.isDirtyRow('1')).toBe(true);

      // Reverting the value back to the original clears the dirty state
      service.updateDoc('1', { name: 'Boris' });
      expect(await firstValueFrom(service.hasUnsavedChanges$)).toBe(false);
      expect(service.isDirtyRow('1')).toBe(false);
    });

    it('does not mark unsaved changes if the only change is deleting a placeholder row', async () => {
      const initial = await firstValueFrom(service.hasUnsavedChanges$);
      expect(initial).toBe(false);

      service.addEmptyRow(1);
      const placeholderRow = (await firstValueFrom(service.rows$))[0];

      service.deleteDoc([placeholderRow.id]);

      const afterAdd = await firstValueFrom(service.hasUnsavedChanges$);
      expect(afterAdd).toBe(false);
    });
  });

  it('Handles rows successive modifications in a correct manner', async () => {
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
    expect(rowsAfterDeletion[0].id).toEqual(expect.stringContaining(ROW_PLACEHOLDER_PREFIX));
  });

  describe('updateDoc value parsing', () => {
    it('keeps the raw text for string-typed fields so object-like values are not coerced', async () => {
      const rows = await firstValueFrom(service.rows$);

      service.updateDoc(rows[0].id, { asd4: '{}' }, [
        { id: 'asd4', name: 'asd4', meta: { type: 'string', esType: 'text' } },
      ]);

      const rowsAfterEdition = await firstValueFrom(service.rows$);
      expect(rowsAfterEdition[0].raw).toEqual({ asd4: '{}' });
    });

    it('infers the value type when no field type is provided', async () => {
      const rows = await firstValueFrom(service.rows$);

      service.updateDoc(rows[0].id, { count: '42', enabled: 'true', meta: '{}' });

      const rowsAfterEdition = await firstValueFrom(service.rows$);
      expect(rowsAfterEdition[0].raw).toEqual({ count: 42, enabled: true, meta: {} });
    });
  });

  describe('flush operations', () => {
    it('should call telemetry on successful flush', async () => {
      (http.post as jest.Mock).mockResolvedValue({
        errors: false,
        items: [],
        took: 0,
      } satisfies BulkResponse);
      const telemetrySpy = jest.spyOn(indexEditorTelemetryService, 'trackSaveSubmitted');

      service.setIndexName('my-index');
      service.setIndexCreated(true);
      await firstValueFrom(service.dataView$);

      // Modifying the placeholder row counts as 1 row added and 0 cells edited
      const placeholderRow = (await firstValueFrom(service.rows$))[0];
      service.updateDoc(placeholderRow.id, { field: 'value' });

      // Adding a column and editing its name counts as 1 col added
      service.addNewColumn('column1', 'keyword');
      const newColumn = (await firstValueFrom(service.pendingColumnsToBeSaved$))[0];
      service.editColumn('newColumn', newColumn.name, 'keyword');

      // Counts as 2 cell edited
      service.updateDoc('123', { field: 'value' });
      service.updateDoc('123', { newColumn: 'value' });

      // Wait for the changes to be registered
      await firstValueFrom(service.hasUnsavedChanges$);

      // Save the changes
      service.flush();

      // wait for async operations to complete
      await new Promise((resolve) => process.nextTick(resolve));

      expect(telemetrySpy).toHaveBeenCalledWith({
        pendingRowsAdded: 1,
        pendingColsAdded: 1,
        pendingCellsEdited: 2,
        action: 'save',
        outcome: 'success',
        latency: expect.any(Number),
      });
    });
  });

  describe('resetIndexMapping', () => {
    it('should recreate index, refresh dataview, discard changes and refetch when index is created', async () => {
      service.setIndexName('my-index');
      service.setIndexCreated(true);

      await service.resetIndexMapping();

      // Verify the recreate endpoint was called with the index mode
      expect(http.post).toHaveBeenCalledWith(`${INDEX_EDITOR_RECREATE_ROUTE}/my-index`, {
        body: JSON.stringify({ mode: 'standard' }),
      });

      // Verify unsaved changes were discarded
      const hasChangesAfterReset = await firstValueFrom(service.hasUnsavedChanges$);
      expect(hasChangesAfterReset).toBe(false);
    });

    it('should not call recreate endpoint if index is not created', async () => {
      service.setIndexName('my-index');

      await service.resetIndexMapping();

      // Verify the recreate endpoint was not called
      expect(http.post).not.toHaveBeenCalled();

      // Verify unsaved changes were discarded
      const hasChangesAfterReset = await firstValueFrom(service.hasUnsavedChanges$);
      expect(hasChangesAfterReset).toBe(false);
    });
  });

  describe('createIndex', () => {
    beforeEach(() => {
      (http.post as jest.Mock).mockResolvedValue({
        errors: false,
        items: [],
        took: 0,
      } satisfies BulkResponse);
    });

    it('creates a standard index by posting the standard mode to the create endpoint', async () => {
      service.setIndexName('my-index');

      await service.createIndex({ exitAfterFlush: false });

      expect(http.post).toHaveBeenCalledWith(`${INDEX_EDITOR_CREATE_ROUTE}/my-index`, {
        body: JSON.stringify({ mode: 'standard' }),
      });
    });

    it('creates a lookup index by posting the lookup mode to the create endpoint', async () => {
      const lookupService = new IndexUpdateService(
        http,
        data,
        notifications,
        indexEditorTelemetryService,
        true,
        'lookup'
      );
      lookupService.setIndexName('my-lookup-index');

      await lookupService.createIndex({ exitAfterFlush: false });

      expect(http.post).toHaveBeenCalledWith(`${INDEX_EDITOR_CREATE_ROUTE}/my-lookup-index`, {
        body: JSON.stringify({ mode: 'lookup' }),
      });

      lookupService.destroy();
    });
  });

  describe('fetchIndexResolution', () => {
    it('resolves the index name against the resolve route', async () => {
      const resolution: IndexEditorResolution = {
        kind: 'index',
        mode: 'lookup',
        closed: false,
        frozen: false,
        routingRequired: false,
        sourceDisabled: false,
        sourceSynthetic: false,
        runtimeFields: [],
      };
      (http.get as jest.Mock).mockResolvedValue(resolution);

      await expect(service.fetchIndexResolution('my-index')).resolves.toEqual(resolution);

      expect(http.get).toHaveBeenCalledWith(`${INDEX_EDITOR_RESOLVE_ROUTE}/my-index`);
    });

    it('encodes the index name in the route', async () => {
      (http.get as jest.Mock).mockResolvedValue({ kind: 'none', closed: false, frozen: false });

      await service.fetchIndexResolution('my index/with:chars');

      expect(http.get).toHaveBeenCalledWith(
        `${INDEX_EDITOR_RESOLVE_ROUTE}/my%20index%2Fwith%3Achars`
      );
    });

    it('returns null when resolution fails so the editor can fall back', async () => {
      (http.get as jest.Mock).mockRejectedValue(new Error('boom'));

      await expect(service.fetchIndexResolution('my-index')).resolves.toBeNull();
    });
  });

  describe('readOnlyColumns', () => {
    it('starts with no read-only columns', async () => {
      await expect(firstValueFrom(service.readOnlyColumns$)).resolves.toEqual(new Map());
    });

    it('exposes runtime-field columns as read-only', async () => {
      service.setReadOnlyColumns(['day_of_week', 'customer.full_name']);

      await expect(firstValueFrom(service.readOnlyColumns$)).resolves.toEqual(
        new Map([
          ['day_of_week', 'runtimeField'],
          ['customer.full_name', 'runtimeField'],
        ])
      );
    });

    it('replaces the previous runtime-field columns on each call', async () => {
      service.setReadOnlyColumns(['a']);
      service.setReadOnlyColumns(['b', 'c']);

      await expect(firstValueFrom(service.readOnlyColumns$)).resolves.toEqual(
        new Map([
          ['b', 'runtimeField'],
          ['c', 'runtimeField'],
        ])
      );
    });

    it('locks columns backed by an array of objects detected from the fetched _source', async () => {
      (data.search.search as jest.Mock).mockReturnValue(
        of({
          rawResponse: {
            columns: [
              { name: 'a.b', type: 'long' },
              { name: 'a.c', type: 'long' },
              { name: 'title', type: 'keyword' },
              { name: '_id', type: 'keyword' },
              { name: '_source', type: '_source' },
            ],
            values: [
              [
                [1, 3],
                [2, 4],
                'hello',
                '1',
                {
                  a: [
                    { b: 1, c: 2 },
                    { b: 3, c: 4 },
                  ],
                  title: 'hello',
                },
              ],
            ],
          },
        })
      );

      service.setIndexName('my-index');
      service.setIndexCreated(true);

      const readOnlyColumns = await firstValueFrom(
        service.readOnlyColumns$.pipe(filter((columns) => columns.size > 0))
      );

      // Only the array-of-objects sub-fields are locked; the scalar field stays editable.
      expect(readOnlyColumns).toEqual(
        new Map([
          ['a.b', 'arrayOfObjects'],
          ['a.c', 'arrayOfObjects'],
        ])
      );
    });

    it('keeps fields inside a single (non-array) object editable', async () => {
      (data.search.search as jest.Mock).mockReturnValue(
        of({
          rawResponse: {
            columns: [
              { name: 'user.name', type: 'keyword' },
              { name: '_id', type: 'keyword' },
              { name: '_source', type: '_source' },
            ],
            values: [['Ada', '1', { user: { name: 'Ada' } }]],
          },
        })
      );

      service.setIndexName('my-index');
      service.setIndexCreated(true);

      await firstValueFrom(service.rows$.pipe(filter((rows) => rows[0]?.id === '1')));

      expect(await firstValueFrom(service.readOnlyColumns$)).toEqual(new Map());
    });
  });

  describe('capped results', () => {
    const CAP = 5000;

    const mockSearch = (docValues: unknown[][], totalCount?: number) => {
      (data.search.search as jest.Mock).mockImplementation(
        ({ params }: { params: { query: string } }) => {
          if (params.query.includes('COUNT(*)')) {
            return of({
              rawResponse: { columns: [{ name: 'total', type: 'long' }], values: [[totalCount]] },
            });
          }
          return of({
            rawResponse: { columns: [{ name: '_id', type: 'keyword' }], values: docValues },
          });
        }
      );
    };

    it('flags capping and resolves the true total when a fetch hits the row cap', async () => {
      const docValues = Array.from({ length: CAP }, (_, i) => [`id-${i}`]);
      mockSearch(docValues, 73421);

      service.setIndexName('big-index');
      service.setIndexCreated(true);

      const capped = await firstValueFrom(service.loadedRowsAreCapped$.pipe(filter(Boolean)));
      expect(capped).toBe(true);

      const total = await firstValueFrom(
        service.totalDocsCount$.pipe(filter((v): v is number => v !== undefined))
      );
      expect(total).toBe(73421);

      const countQueried = (data.search.search as jest.Mock).mock.calls.some(([request]) =>
        request.params.query.includes('COUNT(*)')
      );
      expect(countQueried).toBe(true);
    });

    it('does not query a count when the results fit within the cap', async () => {
      mockSearch([['a'], ['b']]);

      service.setIndexName('small-index');
      service.setIndexCreated(true);

      await firstValueFrom(service.rows$.pipe(filter((rows) => rows.length === 2)));

      expect(await firstValueFrom(service.loadedRowsAreCapped$)).toBe(false);
      expect(await firstValueFrom(service.totalDocsCount$)).toBeUndefined();

      const countQueried = (data.search.search as jest.Mock).mock.calls.some(([request]) =>
        request.params.query.includes('COUNT(*)')
      );
      expect(countQueried).toBe(false);
    });
  });
});
