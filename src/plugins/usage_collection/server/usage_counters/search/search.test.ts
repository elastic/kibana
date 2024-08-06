/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { searchUsageCounters } from './search';
import { mockedUsageCounters } from './search.fixtures';

describe('searchUsageCounters', () => {
  let internalRepository: ReturnType<typeof savedObjectsRepositoryMock.create>;

  beforeEach(() => {
    internalRepository = savedObjectsRepositoryMock.create();
  });

  it('calls repository.find() with the right params', async () => {
    internalRepository.find.mockResolvedValueOnce({
      page: 1,
      per_page: 100,
      total: 8,
      saved_objects: [],
    });

    await searchUsageCounters(internalRepository, {
      filters: {
        domainId: 'foo',
        counterName: 'bar',
        counterType: 'count',
        from: '2024-07-03T10:00:00.000Z',
        source: 'server',
      },
    });

    expect(internalRepository.find).toHaveBeenCalledTimes(1);
    expect(internalRepository.find.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "filter": Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "usage-counter.attributes.domainId",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "foo",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "usage-counter.attributes.counterName",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "bar",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "usage-counter.attributes.counterType",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "count",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "usage-counter.attributes.source",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "server",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "usage-counter.updated_at",
                },
                "gte",
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "2024-07-03T10:00:00.000Z",
                },
              ],
              "function": "range",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        },
        "perPage": 100,
        "pit": Object {
          "id": "some_pit_id",
        },
        "type": "usage-counter",
      }
    `);
  });

  it('aggregates the usage counters with the same ID/namespace', async () => {
    internalRepository.find.mockResolvedValueOnce({
      page: 1,
      per_page: 1000,
      total: 8,
      saved_objects: mockedUsageCounters,
    });

    const res = await searchUsageCounters(internalRepository, { filters: { domainId: 'foo' } });

    expect(res.counters).toMatchInlineSnapshot(`
      Array [
        Object {
          "count": 153,
          "counterName": "bar",
          "counterType": "count",
          "domainId": "foo",
          "records": Array [
            Object {
              "count": 28,
              "updatedAt": "2024-07-08T10:00:00.000Z",
            },
            Object {
              "count": 27,
              "updatedAt": "2024-07-07T10:00:00.000Z",
            },
            Object {
              "count": 26,
              "updatedAt": "2024-07-06T10:00:00.000Z",
            },
            Object {
              "count": 25,
              "updatedAt": "2024-07-05T10:00:00.000Z",
            },
            Object {
              "count": 24,
              "updatedAt": "2024-07-04T10:00:00.000Z",
            },
            Object {
              "count": 23,
              "updatedAt": "2024-07-03T10:00:00.000Z",
            },
          ],
          "source": "server",
        },
      ]
    `);
  });
});
