/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { SavedObjectsClient } from './saved_objects_client';
import { SimpleSavedObjectImpl as SimpleSavedObject } from './simple_saved_object';

describe('SavedObjectsClient', () => {
  const doc = {
    id: 'AVwSwFxtcMV38qjDZoQg',
    type: 'config',
    attributes: { title: 'Example title' },
    version: 'foo',
  };

  const http = httpServiceMock.createStartContract();
  let savedObjectsClient: SavedObjectsClient;

  beforeEach(() => {
    savedObjectsClient = new SavedObjectsClient(http);
    http.fetch.mockClear();
  });

  describe('#get', () => {
    beforeEach(() => {
      http.fetch.mockResolvedValue({ saved_objects: [doc] });
    });

    test('rejects if `type` parameter is undefined', () => {
      return expect(
        savedObjectsClient.get(undefined as any, undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type and id]`);
    });

    test('rejects if `id` parameter is undefined', () => {
      return expect(
        savedObjectsClient.get('index-pattern', undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type and id]`);
    });

    test('rejects when HTTP call fails', () => {
      http.fetch.mockRejectedValue(new Error('Request failed'));
      return expect(savedObjectsClient.get(doc.type, doc.id)).rejects.toMatchInlineSnapshot(
        `[Error: Request failed]`
      );
    });

    test('makes HTTP call', async () => {
      await savedObjectsClient.get(doc.type, doc.id);
      expect(http.fetch.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "/api/saved_objects/_bulk_get",
          Object {
            "body": "[{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"config\\"}]",
            "method": "POST",
            "query": undefined,
          },
        ]
      `);
    });

    test('batches several #get calls into a single HTTP call', async () => {
      // Await #get call to ensure batchQueue is empty and throttle has reset
      await savedObjectsClient.get('type2', doc.id);
      http.fetch.mockClear();

      // Make two #get calls right after one another
      savedObjectsClient.get('type1', doc.id);
      await savedObjectsClient.get('type0', doc.id);
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/_bulk_get",
            Object {
              "body": "[{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"type1\\"},{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"type0\\"}]",
              "method": "POST",
              "query": undefined,
            },
          ],
        ]
      `);
    });

    test('removes duplicates when calling `_bulk_get`', async () => {
      // Await #get call to ensure batchQueue is empty and throttle has reset
      await savedObjectsClient.get('type2', doc.id);
      http.fetch.mockClear();

      savedObjectsClient.get(doc.type, doc.id);
      savedObjectsClient.get('some-type', 'some-id');
      await savedObjectsClient.get(doc.type, doc.id);

      expect(http.fetch).toHaveBeenCalledTimes(1);
      expect(http.fetch.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "/api/saved_objects/_bulk_get",
          Object {
            "body": "[{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"config\\"},{\\"id\\":\\"some-id\\",\\"type\\":\\"some-type\\"}]",
            "method": "POST",
            "query": undefined,
          },
        ]
      `);
    });

    test('resolves with correct object when there are duplicates present', async () => {
      // Await #get call to ensure batchQueue is empty and throttle has reset
      await savedObjectsClient.get('type2', doc.id);
      http.fetch.mockClear();

      const call1 = savedObjectsClient.get(doc.type, doc.id);
      const objFromCall2 = await savedObjectsClient.get(doc.type, doc.id);
      const objFromCall1 = await call1;

      expect(objFromCall1.type).toBe(doc.type);
      expect(objFromCall1.id).toBe(doc.id);

      expect(objFromCall2.type).toBe(doc.type);
      expect(objFromCall2.id).toBe(doc.id);
    });

    test('do not share instances or references between duplicate callers', async () => {
      // Await #get call to ensure batchQueue is empty and throttle has reset
      await savedObjectsClient.get('type2', doc.id);
      http.fetch.mockClear();

      const call1 = savedObjectsClient.get(doc.type, doc.id);
      const objFromCall2 = await savedObjectsClient.get(doc.type, doc.id);
      const objFromCall1 = await call1;

      objFromCall1.set('title', 'new title');
      expect(objFromCall2.get('title')).toEqual('Example title');
    });

    test('resolves with SimpleSavedObject instance', async () => {
      const response = savedObjectsClient.get(doc.type, doc.id);
      await expect(response).resolves.toBeInstanceOf(SimpleSavedObject);

      const result = await response;
      expect(result.type).toBe('config');
      expect(result.get('title')).toBe('Example title');
    });
  });

  describe('#resolve', () => {
    function mockResolvedObjects(...objects: Array<Record<string, unknown>>) {
      http.fetch.mockResolvedValue({
        resolved_objects: objects.map((obj) => ({
          saved_object: obj,
          outcome: 'conflict',
          alias_target_id: 'another-id',
        })),
      });
    }

    test('rejects if `type` parameter is undefined', () => {
      return expect(
        savedObjectsClient.resolve(undefined as any, undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type and id]`);
    });

    test('rejects if `id` parameter is undefined', () => {
      return expect(
        savedObjectsClient.resolve('index-pattern', undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type and id]`);
    });

    test('rejects when HTTP call fails', () => {
      http.fetch.mockRejectedValue(new Error('Request failed'));
      return expect(savedObjectsClient.resolve(doc.type, doc.id)).rejects.toMatchInlineSnapshot(
        `[Error: Request failed]`
      );
    });

    test('makes HTTP call', async () => {
      mockResolvedObjects(doc);
      await savedObjectsClient.resolve(doc.type, doc.id);
      expect(http.fetch.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "/api/saved_objects/_bulk_resolve",
          Object {
            "body": "[{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"config\\"}]",
            "method": "POST",
            "query": undefined,
          },
        ]
      `);
    });

    test('batches several #resolve calls into a single HTTP call', async () => {
      // Await #resolve call to ensure batchQueue is empty and throttle has reset
      mockResolvedObjects({ ...doc, type: 'type2' });
      await savedObjectsClient.resolve('type2', doc.id);
      http.fetch.mockClear();

      // Make two #resolve calls right after one another
      mockResolvedObjects({ ...doc, type: 'type1' }, { ...doc, type: 'type0' });
      savedObjectsClient.resolve('type1', doc.id);
      await savedObjectsClient.resolve('type0', doc.id);
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/_bulk_resolve",
            Object {
              "body": "[{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"type1\\"},{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"type0\\"}]",
              "method": "POST",
              "query": undefined,
            },
          ],
        ]
      `);
    });

    test('handles duplicates correctly', async () => {
      // Await #resolve call to ensure batchQueue is empty and throttle has reset
      mockResolvedObjects({ ...doc, type: 'type2' });
      await savedObjectsClient.resolve('type2', doc.id);
      http.fetch.mockClear();

      mockResolvedObjects(doc, { ...doc, type: 'type2' }, { ...doc, type: 'type3' }); // the client will only request three objects, so we only mock three results
      const call1 = savedObjectsClient.resolve(doc.type, doc.id);
      const call2 = savedObjectsClient.resolve('type2', doc.id);
      const call3 = savedObjectsClient.resolve(doc.type, doc.id);
      const objFromCall4 = await savedObjectsClient.resolve('type3', doc.id);
      const objFromCall1 = await call1;
      const objFromCall2 = await call2;
      const objFromCall3 = await call3;

      // Assertion 1: all calls should return the expected object
      expect(objFromCall1.saved_object).toEqual(
        expect.objectContaining({ type: doc.type, id: doc.id, error: undefined })
      );
      expect(objFromCall2.saved_object).toEqual(
        expect.objectContaining({ type: 'type2', id: doc.id, error: undefined })
      );
      expect(objFromCall3.saved_object).toEqual(
        expect.objectContaining({ type: doc.type, id: doc.id, error: undefined })
      );
      expect(objFromCall4.saved_object).toEqual(
        expect.objectContaining({ type: 'type3', id: doc.id, error: undefined })
      );

      // Assertion 2: requests should be deduplicated (call1 and call3)
      expect(http.fetch).toHaveBeenCalledTimes(1);
      expect(http.fetch.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "/api/saved_objects/_bulk_resolve",
          Object {
            "body": "[{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"config\\"},{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"type2\\"},{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"type3\\"}]",
            "method": "POST",
            "query": undefined,
          },
        ]
      `);

      // Assertion 3: deduplicated requests should not share response object instances or references
      objFromCall1.saved_object.set('title', 'new title');
      expect(objFromCall3.saved_object.get('title')).toEqual('Example title'); // unchanged
    });

    test('resolves with ResolvedSimpleSavedObject instance', async () => {
      mockResolvedObjects(doc);
      const result = await savedObjectsClient.resolve(doc.type, doc.id);
      expect(result.saved_object).toBeInstanceOf(SimpleSavedObject);
      expect(result.saved_object.type).toBe(doc.type);
      expect(result.saved_object.get('title')).toBe('Example title');
      expect(result.outcome).toBe('conflict');
      expect(result.alias_target_id).toBe('another-id');
    });
  });

  describe('#delete', () => {
    beforeEach(() => {
      http.fetch.mockResolvedValue({});
    });

    test('rejects if `type` parameter is undefined', async () => {
      expect(
        savedObjectsClient.delete(undefined as any, undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type and id]`);
    });

    test('throws if `id` parameter is undefined', async () => {
      expect(
        savedObjectsClient.delete('index-pattern', undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type and id]`);
    });

    test('makes HTTP call', async () => {
      await expect(savedObjectsClient.delete('index-pattern', 'logstash-*')).resolves.toEqual({});
      expect(http.fetch.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "/api/saved_objects/index-pattern/logstash-*",
          Object {
            "body": undefined,
            "method": "DELETE",
            "query": Object {
              "force": false,
            },
          },
        ]
      `);
    });
  });

  describe('#bulk_delete', () => {
    const bulkDeleteDoc = {
      id: 'AVwSwFxtcMV38qjDZoQg',
      type: 'config',
    };
    beforeEach(() => {
      http.fetch.mockResolvedValue({
        statuses: [{ id: bulkDeleteDoc.id, type: bulkDeleteDoc.type, success: true }],
      });
    });

    test('deletes with an array of id, type and success status for deleted docs', async () => {
      const response = savedObjectsClient.bulkDelete([bulkDeleteDoc]);
      await expect(response).resolves.toHaveProperty('statuses');

      const result = await response;
      expect(result.statuses).toHaveLength(1);
      expect(result.statuses[0]).toHaveProperty('success');
    });

    test('makes HTTP call', async () => {
      await savedObjectsClient.bulkDelete([bulkDeleteDoc]);
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/_bulk_delete",
            Object {
              "body": "[{\\"type\\":\\"config\\",\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\"}]",
              "method": "POST",
              "query": Object {
                "force": false,
              },
            },
          ],
        ]
      `);
    });
  });

  describe('#update', () => {
    const attributes = { foo: 'Foo', bar: 'Bar' };
    const options = { version: '1' };

    beforeEach(() => {
      http.fetch.mockResolvedValue({ type: 'index-pattern', attributes });
    });

    test('rejects if `type` is undefined', async () => {
      expect(
        savedObjectsClient.update(undefined as any, undefined as any, undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type, id and attributes]`);
    });

    test('rejects if `id` is undefined', async () => {
      expect(
        savedObjectsClient.update('index-pattern', undefined as any, undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type, id and attributes]`);
    });

    test('rejects if `attributes` is undefined', async () => {
      expect(
        savedObjectsClient.update('index-pattern', 'logstash-*', undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type, id and attributes]`);
    });

    test('makes HTTP call', () => {
      savedObjectsClient.update('index-pattern', 'logstash-*', attributes, options);
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/index-pattern/logstash-*",
            Object {
              "body": "{\\"attributes\\":{\\"foo\\":\\"Foo\\",\\"bar\\":\\"Bar\\"},\\"version\\":\\"1\\"}",
              "method": "PUT",
              "query": undefined,
            },
          ],
        ]
      `);
    });

    test('handles the `upsert` option', () => {
      savedObjectsClient.update('index-pattern', 'logstash-*', attributes, {
        upsert: {
          hello: 'dolly',
        },
      });
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/index-pattern/logstash-*",
            Object {
              "body": "{\\"attributes\\":{\\"foo\\":\\"Foo\\",\\"bar\\":\\"Bar\\"},\\"upsert\\":{\\"hello\\":\\"dolly\\"}}",
              "method": "PUT",
              "query": undefined,
            },
          ],
        ]
      `);
    });

    test('rejects when HTTP call fails', async () => {
      http.fetch.mockRejectedValueOnce(new Error('Request failed'));
      await expect(
        savedObjectsClient.update('index-pattern', 'logstash-*', attributes, options)
      ).rejects.toMatchInlineSnapshot(`[Error: Request failed]`);
    });

    test('resolves with SimpleSavedObject instance', async () => {
      const response = savedObjectsClient.update(
        'index-pattern',
        'logstash-*',
        attributes,
        options
      );
      await expect(response).resolves.toBeInstanceOf(SimpleSavedObject);

      const result = await response;
      expect(result.type).toBe('index-pattern');
      expect(result.get('foo')).toBe('Foo');
    });
  });

  describe('#create', () => {
    const attributes = { foo: 'Foo', bar: 'Bar' };

    beforeEach(() => {
      http.fetch.mockResolvedValue({ id: 'serverId', type: 'server-type', attributes });
    });

    test('rejects if `type` is undefined', async () => {
      await expect(
        savedObjectsClient.create(undefined as any, undefined as any)
      ).rejects.toMatchInlineSnapshot(`[Error: requires type and attributes]`);
    });

    test('resolves with SimpleSavedObject instance', async () => {
      const response = savedObjectsClient.create('index-pattern', attributes, { id: 'myId' });
      await expect(response).resolves.toBeInstanceOf(SimpleSavedObject);

      const result = await response;

      expect(result.type).toBe('server-type');
      expect(result.id).toBe('serverId');
      expect(result.attributes).toBe(attributes);
    });

    test('makes HTTP call with ID', () => {
      savedObjectsClient.create('index-pattern', attributes, { id: 'myId' });
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/index-pattern/myId",
            Object {
              "body": "{\\"attributes\\":{\\"foo\\":\\"Foo\\",\\"bar\\":\\"Bar\\"}}",
              "method": "POST",
              "query": Object {
                "overwrite": undefined,
              },
            },
          ],
        ]
      `);
    });

    test('makes HTTP call without ID', () => {
      savedObjectsClient.create('index-pattern', attributes);
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/index-pattern",
            Object {
              "body": "{\\"attributes\\":{\\"foo\\":\\"Foo\\",\\"bar\\":\\"Bar\\"}}",
              "method": "POST",
              "query": Object {
                "overwrite": undefined,
              },
            },
          ],
        ]
      `);
    });

    test('rejects when HTTP call fails', async () => {
      http.fetch.mockRejectedValueOnce(new Error('Request failed'));
      await expect(
        savedObjectsClient.create('index-pattern', attributes, { id: 'myId' })
      ).rejects.toMatchInlineSnapshot(`[Error: Request failed]`);
    });
  });

  describe('#bulk_create', () => {
    beforeEach(() => {
      http.fetch.mockResolvedValue({ saved_objects: [doc] });
    });

    test('resolves with array of SimpleSavedObject instances', async () => {
      const response = savedObjectsClient.bulkCreate([doc]);
      await expect(response).resolves.toHaveProperty('savedObjects');

      const result = await response;
      expect(result.savedObjects).toHaveLength(1);
      expect(result.savedObjects[0]).toBeInstanceOf(SimpleSavedObject);
    });

    test('makes HTTP call', async () => {
      await savedObjectsClient.bulkCreate([doc]);
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/_bulk_create",
            Object {
              "body": "[{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"config\\",\\"attributes\\":{\\"title\\":\\"Example title\\"},\\"version\\":\\"foo\\"}]",
              "method": "POST",
              "query": Object {
                "overwrite": false,
              },
            },
          ],
        ]
      `);
    });

    test('makes HTTP call with overwrite query paramater', async () => {
      await savedObjectsClient.bulkCreate([doc], { overwrite: true });
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/_bulk_create",
            Object {
              "body": "[{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"config\\",\\"attributes\\":{\\"title\\":\\"Example title\\"},\\"version\\":\\"foo\\"}]",
              "method": "POST",
              "query": Object {
                "overwrite": true,
              },
            },
          ],
        ]
      `);
    });
  });

  describe('#bulk_update', () => {
    const bulkUpdateDoc = {
      id: 'AVwSwFxtcMV38qjDZoQg',
      type: 'config',
      attributes: { title: 'Example title' },
      version: 'foo',
    };
    beforeEach(() => {
      http.fetch.mockResolvedValue({ saved_objects: [bulkUpdateDoc] });
    });

    test('resolves with array of SimpleSavedObject instances', async () => {
      const response = savedObjectsClient.bulkUpdate([bulkUpdateDoc]);
      await expect(response).resolves.toHaveProperty('savedObjects');

      const result = await response;
      expect(result.savedObjects).toHaveLength(1);
      expect(result.savedObjects[0]).toBeInstanceOf(SimpleSavedObject);
    });

    test('makes HTTP call', async () => {
      await savedObjectsClient.bulkUpdate([bulkUpdateDoc]);
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/_bulk_update",
            Object {
              "body": "[{\\"id\\":\\"AVwSwFxtcMV38qjDZoQg\\",\\"type\\":\\"config\\",\\"attributes\\":{\\"title\\":\\"Example title\\"},\\"version\\":\\"foo\\"}]",
              "method": "PUT",
              "query": undefined,
            },
          ],
        ]
      `);
    });
  });

  describe('#find', () => {
    const object = { id: 'logstash-*', type: 'index-pattern', title: 'Test' };

    beforeEach(() => {
      http.fetch.mockResolvedValue({ saved_objects: [object], page: 0, per_page: 1, total: 1 });
    });

    test('resolves with instances of SimpleSavedObjects', async () => {
      const options = { type: 'index-pattern' };
      const resultP = savedObjectsClient.find(options);
      await expect(resultP).resolves.toHaveProperty('savedObjects');

      const result = await resultP;
      expect(result.savedObjects).toHaveLength(1);
      expect(result.savedObjects[0]).toBeInstanceOf(SimpleSavedObject);
      expect(result.page).toBe(0);
      expect(result.perPage).toBe(1);
      expect(result.total).toBe(1);
    });

    test('makes HTTP call correctly mapping options into snake case query parameters', () => {
      const options = {
        defaultSearchOperator: 'OR' as const,
        fields: ['title'],
        hasReference: { id: '1', type: 'reference' },
        hasNoReference: { id: '1', type: 'reference' },
        page: 10,
        perPage: 100,
        search: 'what is the meaning of life?|life',
        searchFields: ['title^5', 'body'],
        sortField: 'sort_field',
        type: 'index-pattern',
      };

      savedObjectsClient.find(options);
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/_find",
            Object {
              "body": undefined,
              "method": "GET",
              "query": Object {
                "default_search_operator": "OR",
                "fields": Array [
                  "title",
                ],
                "has_no_reference": "{\\"id\\":\\"1\\",\\"type\\":\\"reference\\"}",
                "has_reference": "{\\"id\\":\\"1\\",\\"type\\":\\"reference\\"}",
                "page": 10,
                "per_page": 100,
                "search": "what is the meaning of life?|life",
                "search_fields": Array [
                  "title^5",
                  "body",
                ],
                "sort_field": "sort_field",
                "type": "index-pattern",
              },
            },
          ],
        ]
      `);
    });

    test('ignores invalid options', () => {
      const options = {
        invalid: true,
        namespace: 'default',
        sortOrder: 'sort', // Not currently supported by API
      };

      // @ts-expect-error
      savedObjectsClient.find(options);
      expect(http.fetch.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "/api/saved_objects/_find",
            Object {
              "body": undefined,
              "method": "GET",
              "query": Object {},
            },
          ],
        ]
      `);
    });
  });
});
