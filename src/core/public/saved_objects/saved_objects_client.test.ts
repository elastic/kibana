/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectsClient } from './saved_objects_client';
import { SimpleSavedObject } from './simple_saved_object';
import { httpServiceMock } from '../http/http_service.mock';

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

    test('resolves with SimpleSavedObject instance', async () => {
      const response = savedObjectsClient.get(doc.type, doc.id);
      await expect(response).resolves.toBeInstanceOf(SimpleSavedObject);

      const result = await response;
      expect(result.type).toBe('config');
      expect(result.get('title')).toBe('Example title');
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
            "query": undefined,
          },
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
                "has_reference": Object {
                  "id": "1",
                  "type": "reference",
                },
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

      // @ts-ignore
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

  it('maintains backwards compatibility by transforming http.fetch errors to be compatible with kfetch errors', () => {
    const err = {
      response: { ok: false, redirected: false, status: 409, statusText: 'Conflict' },
      body: 'response body',
    };
    http.fetch.mockRejectedValue(err);
    return expect(savedObjectsClient.get(doc.type, doc.id)).rejects.toMatchInlineSnapshot(`
                    Object {
                      "body": "response body",
                      "res": Object {
                        "ok": false,
                        "redirected": false,
                        "status": 409,
                        "statusText": "Conflict",
                      },
                    }
                `);
  });
});
