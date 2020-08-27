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

import { visualizationSavedObjectTypeMigrations } from './visualization_migrations';
import { SavedObjectMigrationContext, SavedObjectMigrationFn } from 'kibana/server';

const savedObjectMigrationContext = (null as unknown) as SavedObjectMigrationContext;

describe('migration visualization', () => {
  describe('6.7.2', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['6.7.2'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );
    let doc: any;

    describe('date histogram time zone removal', () => {
      beforeEach(() => {
        doc = {
          attributes: {
            visState: JSON.stringify({
              aggs: [
                {
                  enabled: true,
                  id: '1',
                  params: {
                    // Doesn't make much sense but we want to test it's not removing it from anything else
                    time_zone: 'Europe/Berlin',
                  },
                  schema: 'metric',
                  type: 'count',
                },
                {
                  enabled: true,
                  id: '2',
                  params: {
                    customInterval: '2h',
                    drop_partials: false,
                    extended_bounds: {},
                    field: 'timestamp',
                    time_zone: 'Europe/Berlin',
                    interval: 'auto',
                    min_doc_count: 1,
                    useNormalizedEsInterval: true,
                  },
                  schema: 'segment',
                  type: 'date_histogram',
                },
                {
                  enabled: true,
                  id: '4',
                  params: {
                    customInterval: '2h',
                    drop_partials: false,
                    extended_bounds: {},
                    field: 'timestamp',
                    interval: 'auto',
                    min_doc_count: 1,
                    useNormalizedEsInterval: true,
                  },
                  schema: 'segment',
                  type: 'date_histogram',
                },
                {
                  enabled: true,
                  id: '3',
                  params: {
                    customBucket: {
                      enabled: true,
                      id: '1-bucket',
                      params: {
                        customInterval: '2h',
                        drop_partials: false,
                        extended_bounds: {},
                        field: 'timestamp',
                        interval: 'auto',
                        min_doc_count: 1,
                        time_zone: 'Europe/Berlin',
                        useNormalizedEsInterval: true,
                      },
                      type: 'date_histogram',
                    },
                    customMetric: {
                      enabled: true,
                      id: '1-metric',
                      params: {},
                      type: 'count',
                    },
                  },
                  schema: 'metric',
                  type: 'max_bucket',
                },
              ],
            }),
          },
        } as Parameters<SavedObjectMigrationFn>[0];
      });

      it('should remove time_zone from date_histogram aggregations', () => {
        const migratedDoc = migrate(doc);
        const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;

        expect(aggs[1]).not.toHaveProperty('params.time_zone');
      });

      it('should not remove time_zone from non date_histogram aggregations', () => {
        const migratedDoc = migrate(doc);
        const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;

        expect(aggs[0]).toHaveProperty('params.time_zone');
      });

      it('should remove time_zone from nested aggregations', () => {
        const migratedDoc = migrate(doc);
        const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;

        expect(aggs[3]).not.toHaveProperty('params.customBucket.params.time_zone');
      });

      it('should not fail on date histograms without a time_zone', () => {
        const migratedDoc = migrate(doc);
        const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;

        expect(aggs[2]).not.toHaveProperty('params.time_zone');
      });

      it('should be able to apply the migration twice, since we need it for 6.7.2 and 7.0.1', () => {
        const migratedDoc = migrate(doc);
        const aggs = JSON.parse(migratedDoc.attributes.visState).aggs;

        expect(aggs[1]).not.toHaveProperty('params.time_zone');
        expect(aggs[0]).toHaveProperty('params.time_zone');
        expect(aggs[3]).not.toHaveProperty('params.customBucket.params.time_zone');
        expect(aggs[2]).not.toHaveProperty('params.time_zone');
      });

      it('should migrate obsolete match_all query', () => {
        const migratedDoc = migrate({
          ...doc,
          attributes: {
            ...doc.attributes,
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({
                query: {
                  match_all: {},
                },
              }),
            },
          },
        });
        const migratedSearchSource = JSON.parse(
          migratedDoc.attributes.kibanaSavedObjectMeta.searchSourceJSON
        );

        expect(migratedSearchSource).toEqual({
          query: {
            query: '',
            language: 'kuery',
          },
        });
      });
    });
  });

  describe('7.0.0', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.0.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const generateDoc = (type: any, aggs: any) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({ type, aggs }),
        uiStateJSON: '{}',
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
      references: [],
    });

    it('does not throw error on empty object', () => {
      const migratedDoc = migrate({
        attributes: {
          visState: '{}',
        },
      });
      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "visState": "{}",
          },
          "references": Array [],
        }
      `);
    });

    it('skips errors when searchSourceJSON is null', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: null,
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": null,
            },
            "savedSearchRefName": "search_0",
            "visState": "{}",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "123",
              "name": "search_0",
              "type": "search",
            },
          ],
          "type": "visualization",
        }
      `);
    });

    it('skips errors when searchSourceJSON is undefined', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: undefined,
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": undefined,
            },
            "savedSearchRefName": "search_0",
            "visState": "{}",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "123",
              "name": "search_0",
              "type": "search",
            },
          ],
          "type": "visualization",
        }
      `);
    });

    it('skips error when searchSourceJSON is not a string', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: 123,
          },
          savedSearchId: '123',
        },
      };

      expect(migrate(doc)).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": 123,
            },
            "savedSearchRefName": "search_0",
            "visState": "{}",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "123",
              "name": "search_0",
              "type": "search",
            },
          ],
          "type": "visualization",
        }
      `);
    });

    it('skips error when searchSourceJSON is invalid json', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{abc123}',
          },
          savedSearchId: '123',
        },
      };

      expect(migrate(doc)).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": "{abc123}",
            },
            "savedSearchRefName": "search_0",
            "visState": "{}",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "123",
              "name": "search_0",
              "type": "search",
            },
          ],
          "type": "visualization",
        }
      `);
    });

    it('skips error when "index" and "filter" is missing from searchSourceJSON', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true }),
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": "{\\"bar\\":true}",
            },
            "savedSearchRefName": "search_0",
            "visState": "{}",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "123",
              "name": "search_0",
              "type": "search",
            },
          ],
          "type": "visualization",
        }
      `);
    });

    it('extracts "index" attribute from doc', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({ bar: true, index: 'pattern*' }),
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": "{\\"bar\\":true,\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
            },
            "savedSearchRefName": "search_0",
            "visState": "{}",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "pattern*",
              "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
              "type": "index-pattern",
            },
            Object {
              "id": "123",
              "name": "search_0",
              "type": "search",
            },
          ],
          "type": "visualization",
        }
      `);
    });

    it('extracts index patterns from the filter', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              bar: true,
              filter: [
                {
                  meta: { index: 'my-index', foo: true },
                },
              ],
            }),
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": "{\\"bar\\":true,\\"filter\\":[{\\"meta\\":{\\"foo\\":true,\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index\\"}}]}",
            },
            "savedSearchRefName": "search_0",
            "visState": "{}",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "my-index",
              "name": "kibanaSavedObjectMeta.searchSourceJSON.filter[0].meta.index",
              "type": "index-pattern",
            },
            Object {
              "id": "123",
              "name": "search_0",
              "type": "search",
            },
          ],
          "type": "visualization",
        }
      `);
    });

    it('extracts index patterns from controls', () => {
      const doc = {
        id: '1',
        type: 'visualization',
        attributes: {
          foo: true,
          visState: JSON.stringify({
            bar: false,
            params: {
              controls: [
                {
                  bar: true,
                  indexPattern: 'pattern*',
                },
                {
                  foo: true,
                },
              ],
            },
          }),
        },
      };
      const migratedDoc = migrate(doc);

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "foo": true,
            "visState": "{\\"bar\\":false,\\"params\\":{\\"controls\\":[{\\"bar\\":true,\\"indexPatternRefName\\":\\"control_0_index_pattern\\"},{\\"foo\\":true}]}}",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "pattern*",
              "name": "control_0_index_pattern",
              "type": "index-pattern",
            },
          ],
          "type": "visualization",
        }
      `);
    });

    it('skips extracting savedSearchId when missing', () => {
      const doc = {
        id: '1',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
        },
      };
      const migratedDoc = migrate(doc);

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": "{}",
            },
            "visState": "{}",
          },
          "id": "1",
          "references": Array [],
        }
      `);
    });

    it('extract savedSearchId from doc', () => {
      const doc = {
        id: '1',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
          savedSearchId: '123',
        },
      };
      const migratedDoc = migrate(doc);

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": "{}",
            },
            "savedSearchRefName": "search_0",
            "visState": "{}",
          },
          "id": "1",
          "references": Array [
            Object {
              "id": "123",
              "name": "search_0",
              "type": "search",
            },
          ],
        }
      `);
    });

    it('delete savedSearchId when empty string in doc', () => {
      const doc = {
        id: '1',
        attributes: {
          visState: '{}',
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
          savedSearchId: '',
        },
      };
      const migratedDoc = migrate(doc);

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "kibanaSavedObjectMeta": Object {
              "searchSourceJSON": "{}",
            },
            "visState": "{}",
          },
          "id": "1",
          "references": Array [],
        }
      `);
    });

    it('should return a new object if vis is table and has multiple split aggs', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar' },
        },
        {
          id: '3',
          schema: 'split',
          params: { hey: 'ya' },
        },
      ];
      const tableDoc = generateDoc('table', aggs);
      const expected = tableDoc;
      const actual = migrate(tableDoc);

      expect(actual).not.toEqual(expected);
    });

    it('should not touch any vis that is not table', () => {
      const pieDoc = generateDoc('pie', []);
      const expected = pieDoc;
      const actual = migrate(pieDoc);

      expect(actual).toEqual(expected);
    });

    it('should not change values in any vis that is not table', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar' },
        },
        {
          id: '3',
          schema: 'segment',
          params: { hey: 'ya' },
        },
      ];
      const pieDoc = generateDoc('pie', aggs);
      const expected = pieDoc;
      const actual = migrate(pieDoc);

      expect(actual).toEqual(expected);
    });

    it('should not touch table vis if there are not multiple split aggs', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar' },
        },
      ];
      const tableDoc = generateDoc('table', aggs);
      const expected = tableDoc;
      const actual = migrate(tableDoc);

      expect(actual).toEqual(expected);
    });

    it('should change all split aggs to `bucket` except the first', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar' },
        },
        {
          id: '3',
          schema: 'split',
          params: { hey: 'ya' },
        },
        {
          id: '4',
          schema: 'bucket',
          params: { heyyy: 'yaaa' },
        },
      ];
      const expected = ['metric', 'split', 'bucket', 'bucket'];
      const migrated = migrate(generateDoc('table', aggs));
      const actual = JSON.parse(migrated.attributes.visState);

      expect(actual.aggs.map((agg: any) => agg.schema)).toEqual(expected);
    });

    it('should remove `rows` param from any aggs that are not `split`', () => {
      const aggs = [
        {
          id: '1',
          schema: 'metric',
          params: {},
        },
        {
          id: '2',
          schema: 'split',
          params: { foo: 'bar' },
        },
        {
          id: '3',
          schema: 'split',
          params: { hey: 'ya' },
        },
      ];
      const expected = [{}, { foo: 'bar' }, { hey: 'ya' }];
      const migrated = migrate(generateDoc('table', aggs));
      const actual = JSON.parse(migrated.attributes.visState);

      expect(actual.aggs.map((agg: any) => agg.params)).toEqual(expected);
    });

    it('should throw with a reference to the doc name if something goes wrong', () => {
      const doc = {
        attributes: {
          title: 'My Vis',
          description: 'This is my super cool vis.',
          visState: '!/// Intentionally malformed JSON ///!',
          uiStateJSON: '{}',
          version: 1,
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{}',
          },
        },
      };
      expect(() => migrate(doc)).toThrowError(/My Vis/);
    });
  });

  describe('7.2.0', () => {
    describe('date histogram custom interval removal', () => {
      const migrate = (doc: any) =>
        visualizationSavedObjectTypeMigrations['7.2.0'](
          doc as Parameters<SavedObjectMigrationFn>[0],
          savedObjectMigrationContext
        );
      let doc: any;

      beforeEach(() => {
        doc = {
          attributes: {
            visState: JSON.stringify({
              aggs: [
                {
                  enabled: true,
                  id: '1',
                  params: {
                    customInterval: '1h',
                  },
                  schema: 'metric',
                  type: 'count',
                },
                {
                  enabled: true,
                  id: '2',
                  params: {
                    customInterval: '2h',
                    drop_partials: false,
                    extended_bounds: {},
                    field: 'timestamp',
                    interval: 'auto',
                    min_doc_count: 1,
                    useNormalizedEsInterval: true,
                  },
                  schema: 'segment',
                  type: 'date_histogram',
                },
                {
                  enabled: true,
                  id: '4',
                  params: {
                    customInterval: '2h',
                    drop_partials: false,
                    extended_bounds: {},
                    field: 'timestamp',
                    interval: 'custom',
                    min_doc_count: 1,
                    useNormalizedEsInterval: true,
                  },
                  schema: 'segment',
                  type: 'date_histogram',
                },
                {
                  enabled: true,
                  id: '3',
                  params: {
                    customBucket: {
                      enabled: true,
                      id: '1-bucket',
                      params: {
                        customInterval: '2h',
                        drop_partials: false,
                        extended_bounds: {},
                        field: 'timestamp',
                        interval: 'custom',
                        min_doc_count: 1,
                        useNormalizedEsInterval: true,
                      },
                      type: 'date_histogram',
                    },
                    customMetric: {
                      enabled: true,
                      id: '1-metric',
                      params: {},
                      type: 'count',
                    },
                  },
                  schema: 'metric',
                  type: 'max_bucket',
                },
              ],
            }),
          },
        };
      });

      it('should remove customInterval from date_histogram aggregations', () => {
        const migratedDoc = migrate(doc);
        const { aggs } = JSON.parse(migratedDoc.attributes.visState);

        expect(aggs[1]).not.toHaveProperty('params.customInterval');
      });

      it('should not change interval from date_histogram aggregations', () => {
        const migratedDoc = migrate(doc);
        const { aggs } = JSON.parse(migratedDoc.attributes.visState);

        expect(aggs[1].params.interval).toBe(
          JSON.parse(doc.attributes.visState).aggs[1].params.interval
        );
      });

      it('should not remove customInterval from non date_histogram aggregations', () => {
        const migratedDoc = migrate(doc);
        const { aggs } = JSON.parse(migratedDoc.attributes.visState);

        expect(aggs[0]).toHaveProperty('params.customInterval');
      });

      it('should set interval with customInterval value and remove customInterval when interval equals "custom"', () => {
        const migratedDoc = migrate(doc);
        const { aggs } = JSON.parse(migratedDoc.attributes.visState);

        expect(aggs[2].params.interval).toBe(
          JSON.parse(doc.attributes.visState).aggs[2].params.customInterval
        );
        expect(aggs[2]).not.toHaveProperty('params.customInterval');
      });

      it('should remove customInterval from nested aggregations', () => {
        const migratedDoc = migrate(doc);
        const { aggs } = JSON.parse(migratedDoc.attributes.visState);

        expect(aggs[3]).not.toHaveProperty('params.customBucket.params.customInterval');
      });

      it('should remove customInterval from nested aggregations and set interval with customInterval value', () => {
        const migratedDoc = migrate(doc);
        const { aggs } = JSON.parse(migratedDoc.attributes.visState);

        expect(aggs[3].params.customBucket.params.interval).toBe(
          JSON.parse(doc.attributes.visState).aggs[3].params.customBucket.params.customInterval
        );
        expect(aggs[3]).not.toHaveProperty('params.customBucket.params.customInterval');
      });

      it('should not fail on date histograms without a customInterval', () => {
        const migratedDoc = migrate(doc);
        const { aggs } = JSON.parse(migratedDoc.attributes.visState);

        expect(aggs[3]).not.toHaveProperty('params.customInterval');
      });
    });
  });

  describe('7.3.0', () => {
    const logMsgArr: string[] = [];
    const logger = ({
      log: {
        warn: (msg: string) => logMsgArr.push(msg),
      },
    } as unknown) as SavedObjectMigrationContext;

    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.3.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        logger
      );

    it('migrates type = gauge verticalSplit: false to alignment: vertical', () => {
      const migratedDoc = migrate({
        attributes: {
          visState: JSON.stringify({ type: 'gauge', params: { gauge: { verticalSplit: false } } }),
        },
      });
      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "visState": "{\\"type\\":\\"gauge\\",\\"params\\":{\\"gauge\\":{\\"alignment\\":\\"horizontal\\"}}}",
          },
        }
      `);
    });

    it('migrates type = gauge verticalSplit: false to alignment: horizontal', () => {
      const migratedDoc = migrate({
        attributes: {
          visState: JSON.stringify({ type: 'gauge', params: { gauge: { verticalSplit: true } } }),
        },
      });

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "visState": "{\\"type\\":\\"gauge\\",\\"params\\":{\\"gauge\\":{\\"alignment\\":\\"vertical\\"}}}",
          },
        }
      `);
    });

    it('doesnt migrate type = gauge containing invalid visState object, adds message to log', () => {
      const migratedDoc = migrate({
        attributes: {
          visState: JSON.stringify({ type: 'gauge' }),
        },
      });

      expect(migratedDoc).toMatchInlineSnapshot(`
        Object {
          "attributes": Object {
            "visState": "{\\"type\\":\\"gauge\\"}",
          },
        }
      `);
      expect(logMsgArr).toMatchInlineSnapshot(`
        Array [
          "Exception @ migrateGaugeVerticalSplitToAlignment! TypeError: Cannot read property 'gauge' of undefined",
          "Exception @ migrateGaugeVerticalSplitToAlignment! Payload: {\\"type\\":\\"gauge\\"}",
        ]
      `);
    });

    describe('filters agg query migration', () => {
      const doc = {
        attributes: {
          visState: JSON.stringify({
            aggs: [
              {
                type: 'filters',
                params: {
                  filters: [
                    {
                      input: {
                        query: 'response:200',
                      },
                      label: '',
                    },
                    {
                      input: {
                        query: 'response:404',
                      },
                      label: 'bad response',
                    },
                    {
                      input: {
                        query: {
                          exists: {
                            field: 'phpmemory',
                          },
                        },
                      },
                      label: '',
                    },
                  ],
                },
              },
            ],
          }),
        },
      };

      it('should add language property to filters without one, assuming lucene', () => {
        const migrationResult = migrate(doc);

        expect(migrationResult).toEqual({
          attributes: {
            visState: JSON.stringify({
              aggs: [
                {
                  type: 'filters',
                  params: {
                    filters: [
                      {
                        input: {
                          query: 'response:200',
                          language: 'lucene',
                        },
                        label: '',
                      },
                      {
                        input: {
                          query: 'response:404',
                          language: 'lucene',
                        },
                        label: 'bad response',
                      },
                      {
                        input: {
                          query: {
                            exists: {
                              field: 'phpmemory',
                            },
                          },
                          language: 'lucene',
                        },
                        label: '',
                      },
                    ],
                  },
                },
              ],
            }),
          },
        });
      });
    });

    describe('replaceMovAvgToMovFn()', () => {
      let doc: any;

      beforeEach(() => {
        doc = {
          attributes: {
            title: 'VIS',
            visState: `{"title":"VIS","type":"metrics","params":{"id":"61ca57f0-469d-11e7-af02-69e470af7417",
            "type":"timeseries","series":[{"id":"61ca57f1-469d-11e7-af02-69e470af7417","color":"rgba(0,156,224,1)",
            "split_mode":"terms","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417","type":"count",
            "numerator":"FlightDelay:true"},{"settings":"","minimize":0,"window":5,"model":
            "holt_winters","id":"23054fe0-8915-11e9-9b86-d3f94982620f","type":"moving_average","field":
            "61ca57f2-469d-11e7-af02-69e470af7417","predict":1}],"separate_axis":0,"axis_position":"right",
            "formatter":"number","chart_type":"line","line_width":"2","point_size":"0","fill":0.5,"stacked":"none",
            "label":"Percent Delays","terms_size":"2","terms_field":"OriginCityName"}],"time_field":"timestamp",
            "index_pattern":"kibana_sample_data_flights","interval":">=12h","axis_position":"left","axis_formatter":
            "number","show_legend":1,"show_grid":1,"annotations":[{"fields":"FlightDelay,Cancelled,Carrier",
            "template":"{{Carrier}}: Flight Delayed and Cancelled!","index_pattern":"kibana_sample_data_flights",
            "query_string":"FlightDelay:true AND Cancelled:true","id":"53b7dff0-4c89-11e8-a66a-6989ad5a0a39",
            "color":"rgba(0,98,177,1)","time_field":"timestamp","icon":"fa-exclamation-triangle",
            "ignore_global_filters":1,"ignore_panel_filters":1,"hidden":true}],"legend_position":"bottom",
            "axis_scale":"normal","default_index_pattern":"kibana_sample_data_flights","default_timefield":"timestamp"},
            "aggs":[]}`,
          },
          migrationVersion: {
            visualization: '7.2.0',
          },
          type: 'visualization',
        };
      });

      test('should add some necessary moving_fn fields', () => {
        const migratedDoc = migrate(doc);
        const visState = JSON.parse(migratedDoc.attributes.visState);
        const metric = visState.params.series[0].metrics[1];

        expect(metric).toHaveProperty('model_type');
        expect(metric).toHaveProperty('alpha');
        expect(metric).toHaveProperty('beta');
        expect(metric).toHaveProperty('gamma');
        expect(metric).toHaveProperty('period');
        expect(metric).toHaveProperty('multiplicative');
      });
    });
  });

  describe('7.3.0 tsvb', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.3.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const generateDoc = (params: any) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({ params }),
        uiStateJSON: '{}',
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
    });
    it('should change series item filters from a string into an object', () => {
      const params = { type: 'metric', series: [{ filter: 'Filter Bytes Test:>1000' }] };
      const testDoc1 = generateDoc(params);
      const migratedTestDoc1 = migrate(testDoc1);
      const series = JSON.parse(migratedTestDoc1.attributes.visState).params.series;

      expect(series[0].filter).toHaveProperty('query');
      expect(series[0].filter).toHaveProperty('language');
    });
    it('should not change a series item filter string in the object after migration', () => {
      const markdownParams = {
        type: 'markdown',
        series: [
          {
            filter: 'Filter Bytes Test:>1000',
            split_filters: [{ filter: 'bytes:>1000' }],
          },
        ],
      };
      const markdownDoc = generateDoc(markdownParams);
      const migratedMarkdownDoc = migrate(markdownDoc);
      const markdownSeries = JSON.parse(migratedMarkdownDoc.attributes.visState).params.series;

      expect(markdownSeries[0].filter.query).toBe(
        JSON.parse(markdownDoc.attributes.visState).params.series[0].filter
      );
      expect(markdownSeries[0].split_filters[0].filter.query).toBe(
        JSON.parse(markdownDoc.attributes.visState).params.series[0].split_filters[0].filter
      );
    });

    it('should change series item filters from a string into an object for all filters', () => {
      const params = {
        type: 'timeseries',
        filter: 'bytes:>1000',
        series: [
          {
            filter: 'Filter Bytes Test:>1000',
            split_filters: [{ filter: 'bytes:>1000' }],
          },
        ],
        annotations: [{ query_string: 'bytes:>1000' }],
      };
      const timeSeriesDoc = generateDoc(params);
      const migratedtimeSeriesDoc = migrate(timeSeriesDoc);
      const timeSeriesParams = JSON.parse(migratedtimeSeriesDoc.attributes.visState).params;

      expect(Object.keys(timeSeriesParams.series[0].filter)).toEqual(
        expect.arrayContaining(['query', 'language'])
      );
      expect(Object.keys(timeSeriesParams.series[0].split_filters[0].filter)).toEqual(
        expect.arrayContaining(['query', 'language'])
      );
      expect(Object.keys(timeSeriesParams.annotations[0].query_string)).toEqual(
        expect.arrayContaining(['query', 'language'])
      );
    });

    it('should not fail on a metric visualization without a filter in a series item', () => {
      const params = { type: 'metric', series: [{}, {}, {}] };
      const testDoc1 = generateDoc(params);
      const migratedTestDoc1 = migrate(testDoc1);
      const series = JSON.parse(migratedTestDoc1.attributes.visState).params.series;

      expect(series[2]).not.toHaveProperty('filter.query');
    });

    it('should not migrate a visualization of unknown type', () => {
      const params = { type: 'unknown', series: [{ filter: 'foo:bar' }] };
      const doc = generateDoc(params);
      const migratedDoc = migrate(doc);
      const series = JSON.parse(migratedDoc.attributes.visState).params.series;

      expect(series[0].filter).toEqual(params.series[0].filter);
    });
  });

  describe('7.3.1', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.3.1'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    it('should migrate filters agg query string queries', () => {
      const state = {
        aggs: [
          { type: 'count', params: {} },
          {
            type: 'filters',
            params: {
              filters: [
                {
                  input: {
                    query: {
                      query_string: { query: 'machine.os.keyword:"win 8"' },
                    },
                  },
                },
              ],
            },
          },
        ],
      };
      const expected = {
        aggs: [
          { type: 'count', params: {} },
          {
            type: 'filters',
            params: {
              filters: [{ input: { query: 'machine.os.keyword:"win 8"' } }],
            },
          },
        ],
      };
      const migratedDoc = migrate({ attributes: { visState: JSON.stringify(state) } });

      expect(migratedDoc).toEqual({ attributes: { visState: JSON.stringify(expected) } });
    });
  });

  describe('7.4.2 tsvb split_filters migration', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.4.2'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );
    const generateDoc = (params: any) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({ params }),
        uiStateJSON: '{}',
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
    });

    it('should change series item filters from a string into an object for all filters', () => {
      const params = {
        type: 'timeseries',
        filter: {
          query: 'bytes:>1000',
          language: 'lucene',
        },
        series: [
          {
            split_filters: [{ filter: 'bytes:>1000' }],
          },
        ],
      };
      const timeSeriesDoc = generateDoc(params);
      const migratedtimeSeriesDoc = migrate(timeSeriesDoc);
      const timeSeriesParams = JSON.parse(migratedtimeSeriesDoc.attributes.visState).params;

      expect(Object.keys(timeSeriesParams.filter)).toEqual(
        expect.arrayContaining(['query', 'language'])
      );
      expect(timeSeriesParams.series[0].split_filters[0].filter).toEqual({
        query: 'bytes:>1000',
        language: 'lucene',
      });
    });

    it('should change series item split filters when there is no filter item', () => {
      const params = {
        type: 'timeseries',
        filter: {
          query: 'bytes:>1000',
          language: 'lucene',
        },
        series: [
          {
            split_filters: [{ filter: 'bytes:>1000' }],
          },
        ],
        annotations: [
          {
            query_string: {
              query: 'bytes:>1000',
              language: 'lucene',
            },
          },
        ],
      };
      const timeSeriesDoc = generateDoc(params);
      const migratedtimeSeriesDoc = migrate(timeSeriesDoc);
      const timeSeriesParams = JSON.parse(migratedtimeSeriesDoc.attributes.visState).params;

      expect(timeSeriesParams.series[0].split_filters[0].filter).toEqual({
        query: 'bytes:>1000',
        language: 'lucene',
      });
    });

    it('should not convert split_filters to objects if there are no split filter filters', () => {
      const params = {
        type: 'timeseries',
        filter: {
          query: 'bytes:>1000',
          language: 'lucene',
        },
        series: [
          {
            split_filters: [],
          },
        ],
      };
      const timeSeriesDoc = generateDoc(params);
      const migratedtimeSeriesDoc = migrate(timeSeriesDoc);
      const timeSeriesParams = JSON.parse(migratedtimeSeriesDoc.attributes.visState).params;

      expect(timeSeriesParams.series[0].split_filters).not.toHaveProperty('query');
    });

    it('should do nothing if a split_filter is already a query:language object', () => {
      const params = {
        type: 'timeseries',
        filter: {
          query: 'bytes:>1000',
          language: 'lucene',
        },
        series: [
          {
            split_filters: [
              {
                filter: {
                  query: 'bytes:>1000',
                  language: 'lucene',
                },
              },
            ],
          },
        ],
        annotations: [
          {
            query_string: {
              query: 'bytes:>1000',
              language: 'lucene',
            },
          },
        ],
      };
      const timeSeriesDoc = generateDoc(params);
      const migratedtimeSeriesDoc = migrate(timeSeriesDoc);
      const timeSeriesParams = JSON.parse(migratedtimeSeriesDoc.attributes.visState).params;

      expect(timeSeriesParams.series[0].split_filters[0].filter.query).toEqual('bytes:>1000');
      expect(timeSeriesParams.series[0].split_filters[0].filter.language).toEqual('lucene');
    });
  });

  describe('7.7.0 tsvb opperator typo migration', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.7.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );
    const generateDoc = (visState: any) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify(visState),
        uiStateJSON: '{}',
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
    });

    it('should remove the misspelled opperator key if it exists', () => {
      const params = {
        type: 'timeseries',
        filter: {
          query: 'bytes:>1000',
          language: 'lucene',
        },
        series: [],
        gauge_color_rules: [
          {
            value: 0,
            id: '020e3d50-75a6-11ea-8f61-71579ff7f64d',
            gauge: 'rgba(69,39,217,1)',
            opperator: 'lt',
          },
        ],
      };
      const timeSeriesDoc = generateDoc({ params });
      const migratedtimeSeriesDoc = migrate(timeSeriesDoc);
      const migratedParams = JSON.parse(migratedtimeSeriesDoc.attributes.visState).params;

      expect(migratedParams.gauge_color_rules[0]).toMatchInlineSnapshot(`
        Object {
          "gauge": "rgba(69,39,217,1)",
          "id": "020e3d50-75a6-11ea-8f61-71579ff7f64d",
          "opperator": "lt",
          "value": 0,
        }
      `);
    });

    it('should not change color rules with the correct spelling', () => {
      const params = {
        type: 'timeseries',
        filter: {
          query: 'bytes:>1000',
          language: 'lucene',
        },
        series: [],
        gauge_color_rules: [
          {
            value: 0,
            id: '020e3d50-75a6-11ea-8f61-71579ff7f64d',
            gauge: 'rgba(69,39,217,1)',
            opperator: 'lt',
          },
          {
            value: 0,
            id: '020e3d50-75a6-11ea-8f61-71579ff7f64d',
            gauge: 'rgba(69,39,217,1)',
            operator: 'lt',
          },
        ],
      };
      const timeSeriesDoc = generateDoc({ params });
      const migratedtimeSeriesDoc = migrate(timeSeriesDoc);
      const migratedParams = JSON.parse(migratedtimeSeriesDoc.attributes.visState).params;

      expect(migratedParams.gauge_color_rules[1]).toEqual(params.gauge_color_rules[1]);
    });

    it('should move "row" field on split chart by a row or column to vis.params', () => {
      const visData = {
        type: 'area',
        aggs: [
          {
            id: '1',
            schema: 'metric',
            params: {},
          },
          {
            id: '2',
            type: 'terms',
            schema: 'split',
            params: { foo: 'bar', row: true },
          },
        ],
        params: {},
      };

      const migrated = migrate(generateDoc(visData));
      const actual = JSON.parse(migrated.attributes.visState);

      expect(actual.aggs.filter((agg: any) => 'row' in agg.params)).toEqual([]);
      expect(actual.params.row).toBeTruthy();
    });
  });

  describe('7.8.0 tsvb split_color_mode', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.8.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const generateDoc = (params: any) => ({
      attributes: {
        title: 'My Vis',
        type: 'visualization',
        description: 'This is my super cool vis.',
        visState: JSON.stringify(params),
        uiStateJSON: '{}',
        version: 1,
        kibanaSavedObjectMeta: {
          searchSourceJSON: '{}',
        },
      },
    });

    it('should change a missing split_color_mode to gradient', () => {
      const params = { type: 'metrics', params: { series: [{}] } };
      const testDoc1 = generateDoc(params);
      const migratedTestDoc1 = migrate(testDoc1);
      const series = JSON.parse(migratedTestDoc1.attributes.visState).params.series;

      expect(series[0].split_color_mode).toEqual('gradient');
    });

    it('should not change the color mode if it is set', () => {
      const params = { type: 'metrics', params: { series: [{ split_color_mode: 'gradient' }] } };
      const testDoc1 = generateDoc(params);
      const migratedTestDoc1 = migrate(testDoc1);
      const series = JSON.parse(migratedTestDoc1.attributes.visState).params.series;

      expect(series[0].split_color_mode).toEqual('gradient');
    });

    it('should not change the color mode if it is non-default', () => {
      const params = { type: 'metrics', params: { series: [{ split_color_mode: 'rainbow' }] } };
      const testDoc1 = generateDoc(params);
      const migratedTestDoc1 = migrate(testDoc1);
      const series = JSON.parse(migratedTestDoc1.attributes.visState).params.series;

      expect(series[0].split_color_mode).toEqual('rainbow');
    });

    it('should not migrate a visualization of unknown type', () => {
      const params = { type: 'unknown', params: { series: [{}] } };
      const doc = generateDoc(params);
      const migratedDoc = migrate(doc);
      const series = JSON.parse(migratedDoc.attributes.visState).params.series;

      expect(series[0].split_color_mode).toBeUndefined();
    });
  });

  describe('7.10.0 tsvb filter_ratio migration', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.10.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const testDoc1 = {
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: `{"type":"metrics","params":{"id":"61ca57f0-469d-11e7-af02-69e470af7417","type":"timeseries",
        "series":[{"id":"61ca57f1-469d-11e7-af02-69e470af7417","metrics":[{"id":"61ca57f2-469d-11e7-af02-69e470af7417",
        "type":"filter_ratio","numerator":"Filter Bytes Test:>1000","denominator":"Filter Bytes Test:<1000"}]}]}}`,
      },
    };

    it('should replace numerator string with a query object', () => {
      const migratedTestDoc1 = migrate(testDoc1);
      const metric = JSON.parse(migratedTestDoc1.attributes.visState).params.series[0].metrics[0];

      expect(metric.numerator).toHaveProperty('query');
      expect(metric.numerator).toHaveProperty('language');
    });

    it('should replace denominator string with a query object', () => {
      const migratedTestDoc1 = migrate(testDoc1);
      const metric = JSON.parse(migratedTestDoc1.attributes.visState).params.series[0].metrics[0];

      expect(metric.denominator).toHaveProperty('query');
      expect(metric.denominator).toHaveProperty('language');
    });
  });
});
