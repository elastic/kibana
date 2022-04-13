/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAllMigrations } from './visualization_saved_object_migrations';
import {
  SavedObjectMigrationContext,
  SavedObjectMigrationFn,
  SavedObjectUnsanitizedDoc,
} from 'kibana/server';

const savedObjectMigrationContext = null as unknown as SavedObjectMigrationContext;

const testMigrateMatchAllQuery = (migrate: Function) => {
  it('should migrate obsolete match_all query', () => {
    const migratedDoc = migrate({
      type: 'area',
      attributes: {
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

  it('should return original doc if searchSourceJSON cannot be parsed', () => {
    const migratedDoc = migrate({
      type: 'area',
      attributes: {
        kibanaSavedObjectMeta: 'kibanaSavedObjectMeta',
      },
    });

    expect(migratedDoc).toEqual({
      type: 'area',
      attributes: {
        kibanaSavedObjectMeta: 'kibanaSavedObjectMeta',
      },
    });
  });
};

describe('migration visualization', () => {
  const visualizationSavedObjectTypeMigrations = getAllMigrations({});

  describe('6.7.2', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['6.7.2'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );
    let doc: any;

    describe('migrateMatchAllQuery', () => {
      testMigrateMatchAllQuery(migrate);
    });

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
    const logger = {
      log: {
        warn: (msg: string) => logMsgArr.push(msg),
      },
    } as unknown as SavedObjectMigrationContext;

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
          "Exception @ migrateGaugeVerticalSplitToAlignment! TypeError: Cannot read properties of undefined (reading 'gauge')",
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

  describe('7.9.3', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.9.3'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    describe('migrateMatchAllQuery', () => {
      testMigrateMatchAllQuery(migrate);
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

  describe('7.10.0 remove tsvb search source', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.10.0'](
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
          searchSourceJSON: JSON.stringify({
            filter: [],
            query: {
              query: {
                query_string: {
                  query: '*',
                },
              },
              language: 'lucene',
            },
          }),
        },
      },
    });

    it('should remove the search source JSON', () => {
      const timeSeriesDoc = generateDoc({ type: 'metrics' });
      const migratedtimeSeriesDoc = migrate(timeSeriesDoc);
      expect(migratedtimeSeriesDoc.attributes.kibanaSavedObjectMeta.searchSourceJSON).toEqual('{}');
      const { kibanaSavedObjectMeta, ...attributes } = migratedtimeSeriesDoc.attributes;
      const { kibanaSavedObjectMeta: oldKibanaSavedObjectMeta, ...oldAttributes } =
        migratedtimeSeriesDoc.attributes;
      expect(attributes).toEqual(oldAttributes);
    });
  });

  describe('7.11.0 Data table vis - enable toolbar', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.11.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const testDoc = {
      attributes: {
        title: 'My data table vis',
        description: 'Data table vis for test.',
        visState: `{"type":"table","params": {"perPage": 10,"showPartialRows": false,"showTotal": false,"totalFunc": "sum"}}`,
      },
    };

    it('should enable toolbar in visState.params', () => {
      const migratedDataTableVisDoc = migrate(testDoc);
      const visState = JSON.parse(migratedDataTableVisDoc.attributes.visState);
      expect(visState.params.showToolbar).toEqual(true);
    });
  });

  describe('7.12.0 update vislib visualization defaults', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.12.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );
    const getTestDoc = (
      type = 'area',
      categoryAxes?: object[],
      valueAxes?: object[],
      hasPalette = false,
      hasCirclesRadius = false
    ) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({
          type,
          title: '[Flights] Delay Type',
          params: {
            type: type === 'horizontal_bar' ? 'histogram' : type,
            categoryAxes: categoryAxes ?? [
              {
                labels: {},
              },
            ],
            valueAxes: valueAxes ?? [
              {
                labels: {},
              },
            ],
            seriesParams: [
              {
                show: true,
                type,
                mode: 'stacked',
                drawLinesBetweenPoints: true,
                lineWidth: 2,
                showCircles: true,
                interpolate: 'linear',
                valueAxis: 'ValueAxis-1',
                ...(hasCirclesRadius && {
                  circlesRadius: 3,
                }),
              },
            ],
            ...(hasPalette && {
              palette: {
                type: 'palette',
                name: 'default',
              },
            }),
          },
        }),
      },
    });

    it('should return original doc if not area, line or histogram chart', () => {
      const doc = getTestDoc('pie');
      const migratedTestDoc = migrate(doc);
      expect(migratedTestDoc).toEqual(doc);
    });

    it('should decorate existing docs with isVislibVis flag', () => {
      const migratedTestDoc = migrate(getTestDoc());
      const { isVislibVis } = JSON.parse(migratedTestDoc.attributes.visState).params;

      expect(isVislibVis).toEqual(true);
    });

    it('should decorate existing docs without a predefined palette with the kibana legacy palette', () => {
      const migratedTestDoc = migrate(getTestDoc());
      const { palette } = JSON.parse(migratedTestDoc.attributes.visState).params;

      expect(palette.name).toEqual('kibana_palette');
    });

    it('should not overwrite the palette with the legacy one if the palette already exists in the saved object', () => {
      const migratedTestDoc = migrate(getTestDoc('area', undefined, undefined, true));
      const { palette } = JSON.parse(migratedTestDoc.attributes.visState).params;

      expect(palette.name).toEqual('default');
    });

    it("should decorate existing docs with the circlesRadius attribute if it doesn't exist", () => {
      const migratedTestDoc = migrate(getTestDoc());
      const [result] = JSON.parse(migratedTestDoc.attributes.visState).params.seriesParams;

      expect(result.circlesRadius).toEqual(1);
    });

    it('should not decorate existing docs with the circlesRadius attribute if it exists', () => {
      const migratedTestDoc = migrate(getTestDoc('area', undefined, undefined, true, true));
      const [result] = JSON.parse(migratedTestDoc.attributes.visState).params.seriesParams;

      expect(result.circlesRadius).toEqual(3);
    });

    describe('labels.filter', () => {
      it('should keep existing categoryAxes labels.filter value', () => {
        const migratedTestDoc = migrate(getTestDoc('area', [{ labels: { filter: false } }]));
        const [result] = JSON.parse(migratedTestDoc.attributes.visState).params.categoryAxes;

        expect(result.labels.filter).toEqual(false);
      });

      it('should keep existing valueAxes labels.filter value', () => {
        const migratedTestDoc = migrate(
          getTestDoc('area', undefined, [{ labels: { filter: true } }])
        );
        const [result] = JSON.parse(migratedTestDoc.attributes.visState).params.valueAxes;

        expect(result.labels.filter).toEqual(true);
      });

      it('should set categoryAxes labels.filter to true for non horizontal_bar', () => {
        const migratedTestDoc = migrate(getTestDoc());
        const [result] = JSON.parse(migratedTestDoc.attributes.visState).params.categoryAxes;

        expect(result.labels.filter).toEqual(true);
      });

      it('should set categoryAxes labels.filter to false for horizontal_bar', () => {
        const migratedTestDoc = migrate(getTestDoc('horizontal_bar'));
        const [result] = JSON.parse(migratedTestDoc.attributes.visState).params.categoryAxes;

        expect(result.labels.filter).toEqual(false);
      });

      it('should set valueAxes labels.filter to false for non horizontal_bar', () => {
        const migratedTestDoc = migrate(getTestDoc());
        const [result] = JSON.parse(migratedTestDoc.attributes.visState).params.valueAxes;

        expect(result.labels.filter).toEqual(false);
      });

      it('should set valueAxes labels.filter to true for horizontal_bar', () => {
        const migratedTestDoc = migrate(getTestDoc('horizontal_bar'));
        const [result] = JSON.parse(migratedTestDoc.attributes.visState).params.valueAxes;

        expect(result.labels.filter).toEqual(true);
      });
    });
  });

  describe('7.12.0 update "schema" in aggregations', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.12.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );
    const testDoc = {
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({
          type: 'metric',
          title: '[Flights] Delay Type',
          aggs: [
            {
              id: '1',
              type: 'avg_bucket',
              schema: 'metric',
              customBucket: {
                id: '1-bucket',
                params: {
                  orderAgg: {
                    schema: {
                      name: 'orderAgg',
                    },
                  },
                },
                schema: {
                  name: 'bucketAgg',
                },
              },
              customMetric: {
                id: '1-metric',
                schema: {
                  name: 'metricAgg',
                },
                params: {
                  customMetric: {
                    schema: {
                      name: 'metricAgg',
                    },
                  },
                },
              },
            },
            {
              id: '2',
              type: 'avg_bucket',
              schema: 'metric',
              customBucket: {
                id: '2-bucket',
                params: {
                  orderAgg: {
                    schema: {
                      name: 'orderAgg',
                    },
                  },
                },
              },
              customMetric: {
                id: '2-metric',
                schema: 'metricAgg',
                params: {
                  customMetric: {
                    schema: {
                      name: 'metricAgg',
                    },
                  },
                },
              },
            },
          ],
        }),
      },
    };

    const expectedDoc = {
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({
          type: 'metric',
          title: '[Flights] Delay Type',
          aggs: [
            {
              id: '1',
              type: 'avg_bucket',
              schema: 'metric',
              customBucket: {
                id: '1-bucket',
                params: {
                  orderAgg: {
                    schema: 'orderAgg',
                  },
                },
                schema: 'bucketAgg',
              },
              customMetric: {
                id: '1-metric',
                schema: 'metricAgg',
                params: {
                  customMetric: {
                    schema: 'metricAgg',
                  },
                },
              },
            },
            {
              id: '2',
              type: 'avg_bucket',
              schema: 'metric',
              customBucket: {
                id: '2-bucket',
                params: {
                  orderAgg: {
                    schema: 'orderAgg',
                  },
                },
              },
              customMetric: {
                id: '2-metric',
                schema: 'metricAgg',
                params: {
                  customMetric: {
                    schema: 'metricAgg',
                  },
                },
              },
            },
          ],
        }),
      },
    };

    it('should replace all schema object with schema name', () => {
      const migratedTestDoc = migrate(testDoc);

      expect(migratedTestDoc).toEqual(expectedDoc);
    });
  });

  describe('7.13.0 tsvb hide Last value indicator by default', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.13.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const createTestDocWithType = (type: string) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: `{"type":"metrics","params":{"type":"${type}"}}`,
      },
    });

    it('should set hide_last_value_indicator param to true', () => {
      const migratedTestDoc = migrate(createTestDocWithType('markdown'));
      const hideLastValueIndicator = JSON.parse(migratedTestDoc.attributes.visState).params
        .hide_last_value_indicator;

      expect(hideLastValueIndicator).toBeTruthy();
    });

    it('should ignore timeseries type', () => {
      const migratedTestDoc = migrate(createTestDocWithType('timeseries'));
      const hideLastValueIndicator = JSON.parse(migratedTestDoc.attributes.visState).params
        .hide_last_value_indicator;

      expect(hideLastValueIndicator).toBeUndefined();
    });
  });

  describe('7.13.0 tsvb - remove default_index_pattern and default_timefield from Model', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.13.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const createTestDocWithType = () => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: `{"type":"metrics","params":{"default_index_pattern":"test", "default_timefield":"test"}}`,
      },
    });

    it('should remove default_index_pattern and default_timefield', () => {
      const migratedTestDoc = migrate(createTestDocWithType());
      const { params } = JSON.parse(migratedTestDoc.attributes.visState);

      expect(params).not.toHaveProperty('default_index_pattern');
      expect(params).not.toHaveProperty('default_timefield');
    });
  });

  describe('7.13.0 and 7.13.1 tsvb migrations can run twice', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.13.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const migrateAgain = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.13.1'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const createTestDocWithType = (type: string) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: `{"type":"metrics","params":{"type":"${type}","default_index_pattern":"test", "default_timefield":"test", "index_pattern":"testme"}}`,
      },
    });

    it('the migrations can be applied twice without breaking anything', () => {
      const migratedTestDoc = migrate(createTestDocWithType('markdown'));
      const { params } = JSON.parse(migratedTestDoc.attributes.visState);

      expect(params.hide_last_value_indicator).toBeTruthy();
      expect(params).not.toHaveProperty('default_index_pattern');
      expect(params).not.toHaveProperty('default_timefield');
      expect(params.use_kibana_indexes).toBeFalsy();

      const migratedTestDocNew = migrateAgain(migratedTestDoc);
      const visState = JSON.parse(migratedTestDocNew.attributes.visState);

      expect(visState.params.hide_last_value_indicator).toBeTruthy();
      expect(visState.params).not.toHaveProperty('default_index_pattern');
      expect(visState.params).not.toHaveProperty('default_timefield');
      expect(params.use_kibana_indexes).toBeFalsy();
    });
  });

  describe('7.14.0 tsvb - add empty value rule to savedObjects with less and greater then zero rules', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.14.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const rule1 = { value: 0, operator: 'lte', color: 'rgb(145, 112, 184)' };
    const rule2 = { value: 0, operator: 'gte', color: 'rgb(96, 146, 192)' };
    const rule3 = { value: 0, operator: 'gt', color: 'rgb(84, 179, 153)' };
    const rule4 = { value: 0, operator: 'lt', color: 'rgb(84, 179, 153)' };

    const createTestDocWithType = (params: any) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: `{
          "type":"metrics",
          "params": ${JSON.stringify(params)}
        }`,
      },
    });

    const checkEmptyRuleIsAddedToArray = (
      rulesArrayProperty: string,
      prevParams: any,
      migratedParams: any,
      rule: any
    ) => {
      expect(migratedParams).toHaveProperty(rulesArrayProperty);
      expect(Array.isArray(migratedParams[rulesArrayProperty])).toBeTruthy();
      expect(migratedParams[rulesArrayProperty].length).toBe(
        prevParams[rulesArrayProperty].length + 1
      );

      const lastElementIndex = migratedParams[rulesArrayProperty].length - 1;
      expect(migratedParams[rulesArrayProperty][lastElementIndex]).toHaveProperty('operator');
      expect(migratedParams[rulesArrayProperty][lastElementIndex].operator).toEqual('empty');
      expect(migratedParams[rulesArrayProperty][lastElementIndex].color).toEqual(rule.color);
    };

    const checkRuleIsNotAddedToArray = (
      rulesArrayProperty: string,
      prevParams: any,
      migratedParams: any,
      rule: any
    ) => {
      expect(migratedParams).toHaveProperty(rulesArrayProperty);
      expect(Array.isArray(migratedParams[rulesArrayProperty])).toBeTruthy();
      expect(migratedParams[rulesArrayProperty].length).toBe(prevParams[rulesArrayProperty].length);
      // expects, that array contains one element...
      expect(migratedParams[rulesArrayProperty][0].operator).toBe(rule.operator);
    };

    it('should add empty rule if operator = lte and value = 0', () => {
      const params = {
        bar_color_rules: [rule1],
        background_color_rules: [rule1],
        gauge_color_rules: [rule1],
      };
      const migratedTestDoc = migrate(createTestDocWithType(params));
      const { params: migratedParams } = JSON.parse(migratedTestDoc.attributes.visState);

      checkEmptyRuleIsAddedToArray('bar_color_rules', params, migratedParams, rule1);
      checkEmptyRuleIsAddedToArray('background_color_rules', params, migratedParams, rule1);
      checkEmptyRuleIsAddedToArray('gauge_color_rules', params, migratedParams, rule1);
    });

    it('should add empty rule if operator = gte and value = 0', () => {
      const params = {
        bar_color_rules: [rule2],
        background_color_rules: [rule2],
        gauge_color_rules: [rule2],
      };
      const migratedTestDoc = migrate(createTestDocWithType(params));
      const { params: migratedParams } = JSON.parse(migratedTestDoc.attributes.visState);

      checkEmptyRuleIsAddedToArray('bar_color_rules', params, migratedParams, rule2);
      checkEmptyRuleIsAddedToArray('background_color_rules', params, migratedParams, rule2);
      checkEmptyRuleIsAddedToArray('gauge_color_rules', params, migratedParams, rule2);
    });

    it('should not add empty rule if operator = gt or lt and value = any', () => {
      const params = {
        bar_color_rules: [rule3],
        background_color_rules: [rule3],
        gauge_color_rules: [rule4],
      };
      const migratedTestDoc = migrate(createTestDocWithType(params));
      const { params: migratedParams } = JSON.parse(migratedTestDoc.attributes.visState);

      checkRuleIsNotAddedToArray('bar_color_rules', params, migratedParams, rule3);
      checkRuleIsNotAddedToArray('background_color_rules', params, migratedParams, rule3);
      checkRuleIsNotAddedToArray('gauge_color_rules', params, migratedParams, rule4);
    });
  });

  describe('7.14.0 tsvb - add drop last bucket into TSVB model', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.14.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const createTestDocWithType = (params: any) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: `{
          "type":"metrics",
          "params": ${JSON.stringify(params)}
        }`,
      },
    });

    it('should add "drop_last_bucket" into model if it not exist', () => {
      const params = {};
      const migratedTestDoc = migrate(createTestDocWithType(params));
      const { params: migratedParams } = JSON.parse(migratedTestDoc.attributes.visState);

      expect(migratedParams).toMatchInlineSnapshot(`
        Object {
          "drop_last_bucket": 1,
        }
      `);
    });

    it('should add "series_drop_last_bucket" into model if it not exist', () => {
      const params = {
        series: [
          {
            override_index_pattern: 1,
          },
          {
            override_index_pattern: 1,
          },
          { override_index_pattern: 0 },
          {},
          {
            override_index_pattern: 1,
            series_drop_last_bucket: 0,
          },
          {
            override_index_pattern: 1,
            series_drop_last_bucket: 1,
          },
        ],
      };
      const migratedTestDoc = migrate(createTestDocWithType(params));
      const { params: migratedParams } = JSON.parse(migratedTestDoc.attributes.visState);

      expect(migratedParams.series).toMatchInlineSnapshot(`
        Array [
          Object {
            "override_index_pattern": 1,
            "series_drop_last_bucket": 1,
          },
          Object {
            "override_index_pattern": 1,
            "series_drop_last_bucket": 1,
          },
          Object {
            "override_index_pattern": 0,
          },
          Object {},
          Object {
            "override_index_pattern": 1,
            "series_drop_last_bucket": 0,
          },
          Object {
            "override_index_pattern": 1,
            "series_drop_last_bucket": 1,
          },
        ]
      `);
    });
  });

  describe('7.14.0 update pie visualization defaults', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.14.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );
    const getTestDoc = (hasPalette = false) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({
          type: 'pie',
          title: '[Flights] Delay Type',
          params: {
            type: 'pie',
            ...(hasPalette && {
              palette: {
                type: 'palette',
                name: 'default',
              },
            }),
          },
        }),
      },
    });

    it('should decorate existing docs with the kibana legacy palette if the palette is not defined - pie', () => {
      const migratedTestDoc = migrate(getTestDoc());
      const { palette } = JSON.parse(migratedTestDoc.attributes.visState).params;

      expect(palette.name).toEqual('kibana_palette');
    });

    it('should not overwrite the palette with the legacy one if the palette already exists in the saved object', () => {
      const migratedTestDoc = migrate(getTestDoc(true));
      const { palette } = JSON.parse(migratedTestDoc.attributes.visState).params;

      expect(palette.name).toEqual('default');
    });

    it('should default the distinct colors per slice setting to true', () => {
      const migratedTestDoc = migrate(getTestDoc());
      const { distinctColors } = JSON.parse(migratedTestDoc.attributes.visState).params;

      expect(distinctColors).toBe(true);
    });
  });

  describe('7.14.0 replaceIndexPatternReference', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.14.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    test('should replace index_pattern to index-pattern', () => {
      expect(
        migrate({
          references: [
            {
              name: 'name',
              type: 'index_pattern',
            },
          ],
        } as Parameters<SavedObjectMigrationFn>[0])
      ).toMatchInlineSnapshot(`
        Object {
          "references": Array [
            Object {
              "name": "name",
              "type": "index-pattern",
            },
          ],
        }
      `);
    });
  });

  describe('7.14.0 update tagcloud defaults', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.14.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );
    const getTestDoc = (hasPalette = false) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({
          type: 'tagcloud',
          title: '[Flights] Delay Type',
          params: {
            type: 'tagcloud',
            ...(hasPalette && {
              palette: {
                type: 'palette',
                name: 'default',
              },
            }),
          },
        }),
      },
    });

    it('should decorate existing docs with the kibana legacy palette if the palette is not defined - pie', () => {
      const migratedTestDoc = migrate(getTestDoc());
      const { palette } = JSON.parse(migratedTestDoc.attributes.visState).params;

      expect(palette.name).toEqual('kibana_palette');
    });

    it('should not overwrite the palette with the legacy one if the palette already exists in the saved object', () => {
      const migratedTestDoc = migrate(getTestDoc(true));
      const { palette } = JSON.parse(migratedTestDoc.attributes.visState).params;

      expect(palette.name).toEqual('default');
    });
  });

  describe('8.0.0 removeMarkdownLessFromTSVB', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['8.0.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );
    const getTestDoc = () => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: JSON.stringify({
          type: 'metrics',
          title: '[Flights] Delay Type',
          params: {
            id: 'test1',
            type: 'markdown',
            markdwon_less: 'test { color: red }',
            markdown_css: '#markdown-test1 test { color: red }',
          },
        }),
      },
    });

    it('should remove markdown_less and id from markdown_css', () => {
      const migratedTestDoc = migrate(getTestDoc());
      const params = JSON.parse(migratedTestDoc.attributes.visState).params;

      expect(params.mardwon_less).toBeUndefined();
      expect(params.markdown_css).toEqual('test { color: red }');
    });
  });

  describe('7.17.0 tsvb - add drop last bucket into TSVB model', () => {
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.14.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const migrateAgain = (doc: any) =>
      visualizationSavedObjectTypeMigrations['7.17.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    const createTestDocWithType = (params: any) => ({
      attributes: {
        title: 'My Vis',
        description: 'This is my super cool vis.',
        visState: `{
          "type":"metrics",
          "params": ${JSON.stringify(params)}
        }`,
      },
    });

    it('should add "drop_last_bucket" into model if it not exist and run twice', () => {
      const params = {};
      const migratedTestDoc = migrate(createTestDocWithType(params));
      const { params: migratedParams } = JSON.parse(migratedTestDoc.attributes.visState);

      expect(migratedParams).toMatchInlineSnapshot(`
        Object {
          "drop_last_bucket": 1,
        }
      `);

      const migratedTestDocNew = migrateAgain(migratedTestDoc);
      const { params: migratedNewParams } = JSON.parse(migratedTestDocNew.attributes.visState);

      expect(migratedNewParams).toMatchInlineSnapshot(`
        Object {
          "drop_last_bucket": 1,
        }
      `);
    });

    it('should not set "drop_last_bucket" to 1 into model if it exists', () => {
      const params = { drop_last_bucket: 0 };
      const migratedTestDoc = migrate(createTestDocWithType(params));
      const { params: migratedParams } = JSON.parse(migratedTestDoc.attributes.visState);

      expect(migratedParams).toMatchInlineSnapshot(`
        Object {
          "drop_last_bucket": 0,
        }
      `);
    });
  });

  it('should apply search source migrations within visualization', () => {
    const visualizationDoc = {
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({
            some: 'prop',
            migrated: false,
          }),
        },
      },
    } as SavedObjectUnsanitizedDoc;

    const versionToTest = '1.2.3';
    const visMigrations = getAllMigrations({
      [versionToTest]: (state) => ({ ...state, migrated: true }),
    });

    expect(
      visMigrations[versionToTest](visualizationDoc, {} as SavedObjectMigrationContext)
    ).toEqual({
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({
            some: 'prop',
            migrated: true,
          }),
        },
      },
    });
  });

  it('should not apply search source migrations within visualization when searchSourceJSON is not an object', () => {
    const visualizationDoc = {
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: '5',
        },
      },
    } as SavedObjectUnsanitizedDoc;

    const versionToTest = '1.2.4';
    const visMigrations = getAllMigrations({
      [versionToTest]: (state) => ({ ...state, migrated: true }),
    });

    expect(
      visMigrations[versionToTest](visualizationDoc, {} as SavedObjectMigrationContext)
    ).toEqual({
      attributes: {
        kibanaSavedObjectMeta: {
          searchSourceJSON: '5',
        },
      },
    });
  });

  describe('8.1.0 pie - labels and addLegend migration', () => {
    const getDoc = (addLegend: boolean, lastLevel: boolean = false) => ({
      attributes: {
        title: 'Pie Vis',
        description: 'Pie vis',
        visState: JSON.stringify({
          type: 'pie',
          title: 'Pie vis',
          params: {
            addLegend,
            addTooltip: true,
            isDonut: true,
            labels: {
              position: 'default',
              show: true,
              truncate: 100,
              values: true,
              valuesFormat: 'percent',
              percentDecimals: 2,
              last_level: lastLevel,
            },
            legendPosition: 'right',
            nestedLegend: false,
            maxLegendLines: 1,
            truncateLegend: true,
            distinctColors: false,
            palette: {
              name: 'default',
              type: 'palette',
            },
            dimensions: {
              metric: {
                type: 'vis_dimension',
                accessor: 1,
                format: {
                  id: 'number',
                  params: {
                    id: 'number',
                  },
                },
              },
              buckets: [],
            },
          },
        }),
      },
    });
    const migrate = (doc: any) =>
      visualizationSavedObjectTypeMigrations['8.1.0'](
        doc as Parameters<SavedObjectMigrationFn>[0],
        savedObjectMigrationContext
      );

    it('should migrate addLegend to legendDisplay', () => {
      const pie = getDoc(true);
      const migrated = migrate(pie);
      const params = JSON.parse(migrated.attributes.visState).params;

      expect(params.legendDisplay).toBe('show');
      expect(params.addLegend).toBeUndefined();

      const otherPie = getDoc(false);
      const otherMigrated = migrate(otherPie);
      const otherParams = JSON.parse(otherMigrated.attributes.visState).params;

      expect(otherParams.legendDisplay).toBe('hide');
      expect(otherParams.addLegend).toBeUndefined();
    });
  });
});
