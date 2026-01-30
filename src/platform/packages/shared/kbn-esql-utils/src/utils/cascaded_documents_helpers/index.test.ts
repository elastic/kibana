/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import { type ESQLControlVariable, ESQLVariableType } from '@kbn/esql-types';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import {
  getESQLStatsQueryMeta,
  constructCascadeQuery,
  appendFilteringWhereClauseForCascadeLayout,
} from '.';

describe('cascaded documents helpers utils', () => {
  const dataViewMock = createStubDataView({
    spec: {},
  });

  describe('getESQLStatsQueryMeta', () => {
    it('should return an empty array of group by fields and applied functions if the query has a sub query as the data source', () => {
      const queryString = `
        FROM kibana_sample_data_logs, (FROM kibana_sample_data_flights)
        | STATS count = COUNT(bytes), average = AVG(memory)
              BY clientip
      `;

      const result = getESQLStatsQueryMeta(queryString);
      expect(result.groupByFields).toEqual([]);
      expect(result.appliedFunctions).toEqual([]);
    });

    it('does not process a query if it contains a categorize function with a function argument', () => {
      const queryString = `FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY CATEGORIZE(TO_UPPER(event.dataset))`;

      const result = getESQLStatsQueryMeta(queryString);
      expect(result.groupByFields).toEqual([]);
      expect(result.appliedFunctions).toEqual([]);
    });

    it('should return an array of the columns the query has been denoted to be grouped by with the STATS command', () => {
      const queryString = `
        FROM kibana_sample_data_logs, another_index
        | KEEP bytes, clientip, url.keyword, response.keyword
        | STATS Visits = COUNT(), Unique = COUNT_DISTINCT(clientip),
            p95 = PERCENTILE(bytes, 95), median = MEDIAN(bytes)
                BY type, url.keyword
        | EVAL total_records = TO_DOUBLE(count_4xx + count_5xx + count_rest)
        | DROP count_4xx, count_rest, total_records
        | LIMIT 123
      `;

      const result = getESQLStatsQueryMeta(queryString);
      expect(result.groupByFields).toEqual([
        {
          field: 'type',
          type: 'column',
        },
        {
          field: 'url.keyword',
          type: 'column',
        },
      ]);
      expect(result.appliedFunctions).toEqual([
        { identifier: 'Visits', aggregation: 'COUNT' },
        { identifier: 'Unique', aggregation: 'COUNT_DISTINCT' },
        { identifier: 'p95', aggregation: 'PERCENTILE' },
        { identifier: 'median', aggregation: 'MEDIAN' },
      ]);
    });

    it('should return the appropriate metadata from the last STATS command when there are multiple stats commands in the query', () => {
      const queryString = `
        FROM kibana_sample_data_logs
        // First aggregate per client + per URL
        | STATS
            visits_per_client =
              COUNT(), // how many hits this client made to this URL
            p95_bytes_client =
              PERCENTILE(bytes, 95), // 95th percentile of bytes for this client+URL
            median_bytes_client =
              MEDIAN(bytes) // median of bytes for this client+URL
              BY url.keyword, clientip
        // Now roll up those per-client stats to the URL level
        | STATS
            unique_visitors =
              COUNT_DISTINCT(clientip), // how many distinct clients hit this URL
            total_visits =
              SUM(visits_per_client), // median across client-level medians
            p95_bytes_url =
              PERCENTILE(p95_bytes_client, 95), // 95th percentile across client-level p95s
            median_bytes_url =
              MEDIAN(median_bytes_client) // median across client-level medians
              BY url.keyword
        // Sort to see the busiest URLs on top
        | SORT total_visits DESC
      `;

      const result = getESQLStatsQueryMeta(queryString);

      expect(result.groupByFields).toEqual([
        {
          field: 'url.keyword',
          type: 'column',
        },
      ]);
      expect(result.appliedFunctions).toEqual([
        { identifier: 'unique_visitors', aggregation: 'COUNT_DISTINCT' },
        { identifier: 'total_visits', aggregation: 'SUM' },
        { identifier: 'p95_bytes_url', aggregation: 'PERCENTILE' },
        { identifier: 'median_bytes_url', aggregation: 'MEDIAN' },
      ]);
    });

    it(`when the stats query provides unsupported functions as the by option, said functions should not be present in the returned metadata`, () => {
      const queryString = `FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY BUCKET(@timestamp, 1 hour), CATEGORIZE(bytes)`;

      const result = getESQLStatsQueryMeta(queryString);

      expect(result.groupByFields).toEqual([]);
      expect(result.appliedFunctions).toEqual([]);
    });

    it('should return the appropriate metadata when there are multiple stats commands in the query if value of a group references a field that was defined by a preceding command', () => {
      const queryString = `
       FROM kibana_sample_data_logs 
        | STATS count_per_day=COUNT(*) BY category=CATEGORIZE(message), @timestamp=BUCKET(@timestamp, 1 day) 
        | STATS count = SUM(count_per_day), Trend=VALUES(count_per_day) BY category
      `;

      const result = getESQLStatsQueryMeta(queryString);

      expect(result.groupByFields).toEqual([
        {
          field: 'category',
          type: 'categorize',
        },
      ]);

      expect(result.appliedFunctions).toEqual([
        { identifier: 'count', aggregation: 'SUM' },
        { identifier: 'Trend', aggregation: 'VALUES' },
      ]);
    });

    it('should return a single group by field if there is a where command following a STATS by command targeting a column specified as a grouping option in the operating stats command', () => {
      const queryString = `
     FROM kibana_sample_data_logs
      | WHERE clientip == "177.120.218.48"
      | STATS count = COUNT(bytes), average = AVG(memory)
            BY Pattern = CATEGORIZE(message)
      | WHERE
          Pattern ==
            "some random pattern"
      | SORT average ASC
      `;

      const result = getESQLStatsQueryMeta(queryString);

      expect(result.groupByFields).toEqual([
        {
          field: 'Pattern',
          type: 'categorize',
        },
      ]);

      expect(result.appliedFunctions).toEqual([
        { identifier: 'count', aggregation: 'COUNT' },
        { identifier: 'average', aggregation: 'AVG' },
      ]);
    });

    it('should return an empty array of group by fields and applied functions if the query has a keep command that does not specify the current group field', () => {
      const queryString = `
        FROM kibana_sample_data_logs | STATS count = COUNT(*) BY clientip | KEEP count
      `;

      const result = getESQLStatsQueryMeta(queryString);
      expect(result.groupByFields).toEqual([]);
      expect(result.appliedFunctions).toEqual([]);
    });

    it('should return the appropriate metadata despite there being a keep, as long as it specifies the current group field', () => {
      const queryString = `
        FROM kibana_sample_data_logs | STATS Visits = COUNT(), Unique = COUNT_DISTINCT(clientip), p95 = PERCENTILE(bytes, 95), median = MEDIAN(bytes) BY response.keyword | KEEP Visits, Unique, p95, median, response.keyword | LIMIT 123
      `;

      const result = getESQLStatsQueryMeta(queryString);
      expect(result.groupByFields).toEqual([{ field: 'response.keyword', type: 'column' }]);
      expect(result.appliedFunctions).toEqual([
        { aggregation: 'COUNT', identifier: 'Visits' },
        { aggregation: 'COUNT_DISTINCT', identifier: 'Unique' },
        { aggregation: 'PERCENTILE', identifier: 'p95' },
        { aggregation: 'MEDIAN', identifier: 'median' },
      ]);
    });
  });

  describe('constructCascadeQuery', () => {
    describe('leaf queries', () => {
      const nodeType = 'leaf';

      describe('record field column group operations', () => {
        it('should not include the stats command in the cascade query if it does not have any aggregates', () => {
          const editorQuery: AggregateQuery = {
            esql: `
              FROM kibana_sample_data_logs | STATS BY clientip
            `,
          };

          const nodePath = ['clientip'];
          const nodePathMap = { clientip: '192.168.1.1' };

          const cascadeQuery = constructCascadeQuery({
            query: editorQuery,
            dataView: dataViewMock,
            esqlVariables: [],
            nodeType,
            nodePath,
            nodePathMap,
          });

          expect(cascadeQuery).toBeDefined();
          expect(cascadeQuery!.esql).toBe(
            'FROM kibana_sample_data_logs | WHERE clientip == "192.168.1.1"'
          );
        });

        it('should construct a valid cascade leaf query for a query with just one column', () => {
          const editorQuery: AggregateQuery = {
            esql: `
                FROM kibana_sample_data_logs
                | STATS count() BY clientip
                | LIMIT 100
              `,
          };

          const nodePath = ['clientip'];
          const nodePathMap = { clientip: '192.168.1.1' };

          const cascadeQuery = constructCascadeQuery({
            query: editorQuery,
            dataView: dataViewMock,
            esqlVariables: [],
            nodeType,
            nodePath,
            nodePathMap,
          });

          expect(cascadeQuery).toBeDefined();
          expect(cascadeQuery!.esql).toBe(
            'FROM kibana_sample_data_logs | INLINE STATS COUNT() BY clientip | WHERE clientip == "192.168.1.1"'
          );
        });

        it('should construct a valid cascade leaf query for a query with multiple columns and multiple STATS commands', () => {
          const editorQuery: AggregateQuery = {
            esql: `
                FROM kibana_sample_data_logs
                // First aggregate per client + per URL
                | STATS
                    visits_per_client =
                      COUNT(), // how many hits this client made to this URL
                    p95_bytes_client =
                      PERCENTILE(bytes, 95), // 95th percentile of bytes for this client+URL
                    median_bytes_client =
                      MEDIAN(bytes) // median of bytes for this client+URL
                      BY url.keyword, clientip
                // Now roll up those per-client stats to the URL level
                | STATS
                    unique_visitors =
                      COUNT_DISTINCT(clientip), // how many distinct clients hit this URL
                    total_visits =
                      SUM(visits_per_client), // median across client-level medians
                    p95_bytes_url =
                      PERCENTILE(p95_bytes_client, 95), // 95th percentile across client-level p95s
                    median_bytes_url =
                      MEDIAN(median_bytes_client) // median across client-level medians
                      BY url.keyword
                // Sort to see the busiest URLs on top
                | SORT total_visits DESC
              `,
          };

          const nodePath = ['url.keyword'];
          const nodePathMap = {
            'url.keyword': 'https://www.elastic.co/downloads/beats/metricbeat',
          };

          const cascadeQuery = constructCascadeQuery({
            query: editorQuery,
            dataView: dataViewMock,
            esqlVariables: [],
            nodeType,
            nodePath,
            nodePathMap,
          });

          expect(cascadeQuery).toBeDefined();
          expect(cascadeQuery!.esql).toBe(
            'FROM kibana_sample_data_logs | INLINE STATS visits_per_client = COUNT(), p95_bytes_client = PERCENTILE(bytes, 95), median_bytes_client = MEDIAN(bytes) BY url.keyword, clientip | INLINE STATS unique_visitors = COUNT_DISTINCT(clientip), total_visits = SUM(visits_per_client), p95_bytes_url = PERCENTILE(p95_bytes_client, 95), median_bytes_url = MEDIAN(median_bytes_client) BY url.keyword | WHERE `url.keyword` == "https://www.elastic.co/downloads/beats/metricbeat"'
          );
        });

        it('should preserve runtime declarations created by EVAL commands that precede  a STATS command', () => {
          const editorQuery: AggregateQuery = {
            esql: `
              FROM remote_cluster:traces* | EVAL event = CASE(span.duration.us > 100000, "Bad", "Good") | STATS COUNT (*) by event
            `,
          };

          const nodePath = ['event'];
          const nodePathMap = { event: 'Bad' };

          const cascadeQuery = constructCascadeQuery({
            query: editorQuery,
            dataView: dataViewMock,
            esqlVariables: [],
            nodeType,
            nodePath,
            nodePathMap,
          });

          expect(cascadeQuery).toBeDefined();
          expect(cascadeQuery!.esql).toBe(
            'FROM remote_cluster:traces* | EVAL event = CASE(span.duration.us > 100000, "Bad", "Good") | INLINE STATS COUNT(*) BY event | WHERE event == "Bad"'
          );
        });

        it('generate a valid cascade leaf query for a valid stats command that has a parameter value for a grouping option', () => {
          const editorQuery: AggregateQuery = {
            esql: `
             FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY ??field
            `,
          };

          const nodePath = ['??field'];
          const nodePathMap = { '??field': 'some value' };

          const esqlVariables: ESQLControlVariable[] = [
            {
              key: 'field',
              type: ESQLVariableType.FIELDS,
              value: 'bytes',
            },
          ];

          const cascadeQuery = constructCascadeQuery({
            query: editorQuery,
            dataView: dataViewMock,
            esqlVariables,
            nodeType,
            nodePath,
            nodePathMap,
          });

          expect(cascadeQuery).toBeDefined();
          expect(cascadeQuery!.esql).toBe(
            'FROM kibana_sample_data_logs | INLINE STATS count = COUNT(bytes), average = AVG(memory) BY ??field | WHERE bytes == "some value"'
          );
        });

        it('uses match phrase query when the selected column is a text or keyword field that is not aggregatable', () => {
          const editorQuery: AggregateQuery = {
            esql: `
              FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY tags
            `,
          };

          const nodePath = ['tags'];
          const nodePathMap = { tags: 'some random pattern' };

          // apply this mock only for this test
          jest.spyOn(dataViewMock.fields, 'getByName').mockReturnValueOnce({
            esTypes: ['text', 'keyword'],
            aggregatable: false,
          } as unknown as DataViewField);

          const cascadeQuery = constructCascadeQuery({
            query: editorQuery,
            dataView: dataViewMock,
            esqlVariables: [],
            nodeType,
            nodePath,
            nodePathMap,
          });

          expect(cascadeQuery).toBeDefined();
          expect(cascadeQuery!.esql).toBe(
            'FROM kibana_sample_data_logs | WHERE MATCH_PHRASE(tags, "some random pattern")'
          );
        });

        it('uses match phrase query when the selected column is a multi field with a parent field that is a text or keyword field that is not aggregatable', () => {
          const editorQuery: AggregateQuery = {
            esql: `
              FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY tags.keyword
            `,
          };

          const nodePath = ['tags.keyword'];
          const nodePathMap = { 'tags.keyword': 'some random pattern' };

          const mockImpl: jest.Mocked<typeof dataViewMock.fields.getByName> = (fieldName) => {
            return {
              esTypes: ['text', 'keyword'],
              aggregatable: fieldName === 'tags.keyword',
              ...(fieldName === 'tags.keyword'
                ? {
                    subType: {
                      multi: {
                        parent: 'tags',
                      },
                    },
                  }
                : {}),
            } as unknown as DataViewField;
          };

          // only apply this mock for this test
          jest
            .spyOn(dataViewMock.fields, 'getByName')
            .mockImplementationOnce(mockImpl) // satisfies first the call to getByName that marks the field as subType
            .mockImplementationOnce(mockImpl); // satisfies the call to getByName for the parent field

          const cascadeQuery = constructCascadeQuery({
            query: editorQuery,
            dataView: dataViewMock,
            esqlVariables: [],
            nodeType,
            nodePath,
            nodePathMap,
          });

          expect(cascadeQuery).toBeDefined();
          expect(cascadeQuery!.esql).toBe(
            'FROM kibana_sample_data_logs | WHERE MATCH_PHRASE(`tags.keyword`, "some random pattern")'
          );
        });
      });

      describe('function group operations', () => {
        describe('categorize operation', () => {
          it('should throw an error if we attempt to construct a cascade query if the query contains a categorize function with a function argument', () => {
            const editorQuery: AggregateQuery = {
              esql: `
                FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY CATEGORIZE(TO_UPPER(message))
              `,
            };

            const nodePath = ['CATEGORIZE(TO_UPPER(message))'];
            const nodePathMap = { 'CATEGORIZE(TO_UPPER(message))': 'some random pattern' };

            expect(() => {
              constructCascadeQuery({
                query: editorQuery,
                dataView: dataViewMock,
                esqlVariables: [],
                nodeType,
                nodePath,
                nodePathMap,
              });
            }).toThrow();
          });

          it('should construct a valid cascade query for an un-named categorize operation', () => {
            const editorQuery: AggregateQuery = {
              esql: `
                    FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY CATEGORIZE(message)
                  `,
            };

            const nodePath = ['CATEGORIZE(message)'];
            const nodePathMap = { 'CATEGORIZE(message)': 'some random pattern' };

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              dataView: dataViewMock,
              esqlVariables: [],
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toBeDefined();
            expect(cascadeQuery!.esql).toBe(
              'FROM kibana_sample_data_logs | WHERE MATCH(message, "some random pattern", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})'
            );
          });

          it('should construct a valid cascade query for a named categorize operation', () => {
            const editorQuery: AggregateQuery = {
              esql: `
                    FROM kibana_sample_data_logs 
                    | WHERE @timestamp <=?_tend and @timestamp >?_tstart
                      | SAMPLE .001
                      | STATS Count=COUNT(*)/.001 BY Pattern=CATEGORIZE(message)
                      | SORT Count DESC
                  `,
            };

            const nodePath = ['Pattern'];
            const nodePathMap = { Pattern: 'some random pattern' };

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              dataView: dataViewMock,
              esqlVariables: [],
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toBeDefined();
            expect(cascadeQuery!.esql).toBe(
              'FROM kibana_sample_data_logs | WHERE @timestamp <= ?_tend AND @timestamp > ?_tstart | WHERE MATCH(message, "some random pattern", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})'
            );
          });

          it('should construct a valid cascade query for an un-named categorize operation with a function as the argument', () => {
            const editorQuery: AggregateQuery = {
              esql: `
                FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY CATEGORIZE(message)
              `,
            };

            const nodePath = ['CATEGORIZE(message)'];
            const nodePathMap = { 'CATEGORIZE(message)': 'some random pattern' };

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              dataView: dataViewMock,
              esqlVariables: [],
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toBeDefined();
            expect(cascadeQuery!.esql).toBe(
              'FROM kibana_sample_data_logs | WHERE MATCH(message, "some random pattern", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})'
            );
          });

          it('should construct a valid cascade query for a named categorize operation with a function as the argument', () => {
            const editorQuery: AggregateQuery = {
              esql: `
                FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY Pattern = CATEGORIZE(message)
              `,
            };

            const nodePath = ['Pattern'];
            const nodePathMap = { Pattern: 'some random pattern' };

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              dataView: dataViewMock,
              esqlVariables: [],
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toBeDefined();
            expect(cascadeQuery!.esql).toBe(
              'FROM kibana_sample_data_logs | WHERE MATCH(message, "some random pattern", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})'
            );
          });

          it('should construct a valid cascade query for a named categorize operation with a keyword field as the argument', () => {
            const editorQuery: AggregateQuery = {
              esql: `
                FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY Pattern = CATEGORIZE(message.keyword)
              `,
            };

            const nodePath = ['Pattern'];
            const nodePathMap = { Pattern: 'some random pattern' };

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              dataView: dataViewMock,
              esqlVariables: [],
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toBeDefined();
            expect(cascadeQuery!.esql).toBe(
              'FROM kibana_sample_data_logs | WHERE MATCH(message, "some random pattern", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})'
            );
          });

          it('generates a valid cascade leaf query for a valid stats command that has a parameter value for a grouping option in an un-named categorize function', () => {
            const editorQuery: AggregateQuery = {
              esql: `
               FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY CATEGORIZE(??field)
              `,
            };

            const nodePath = ['CATEGORIZE(??field)'];
            const nodePathMap = { 'CATEGORIZE(??field)': 'some random pattern' };

            const esqlVariables: ESQLControlVariable[] = [
              {
                key: 'field',
                type: ESQLVariableType.FIELDS,
                value: 'message',
              },
            ];

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              dataView: dataViewMock,
              esqlVariables,
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toBeDefined();
            expect(cascadeQuery!.esql).toBe(
              'FROM kibana_sample_data_logs | WHERE MATCH(message, "some random pattern", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})'
            );
          });

          it('generates a valid cascade leaf query for a valid stats command that has a parameter value for a grouping option in a named categorize function', () => {
            const editorQuery: AggregateQuery = {
              esql: `
               FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY Pattern = CATEGORIZE(??field)
              `,
            };

            const nodePath = ['Pattern'];
            const nodePathMap = { Pattern: 'some random pattern' };

            const esqlVariables: ESQLControlVariable[] = [
              {
                key: 'field',
                type: ESQLVariableType.FIELDS,
                value: 'message',
              },
            ];

            const cascadeQuery = constructCascadeQuery({
              query: editorQuery,
              dataView: dataViewMock,
              esqlVariables,
              nodeType,
              nodePath,
              nodePathMap,
            });

            expect(cascadeQuery).toBeDefined();
            expect(cascadeQuery!.esql).toBe(
              'FROM kibana_sample_data_logs | WHERE MATCH(message, "some random pattern", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})'
            );
          });
        });
      });
    });
  });

  describe('appendFilteringWhereClauseForCascadeLayout', () => {
    describe('handling for fields not used in the operating stats command', () => {
      it('appends a filter in where clause in an existing query containing a stats command without a where command', () => {
        expect(
          appendFilteringWhereClauseForCascadeLayout(
            'from logstash-* | stats var = avg(woof)',
            [],
            dataViewMock,
            'dest',
            'tada!',
            '+',
            'string'
          )
        ).toBe('FROM logstash-* | WHERE dest == "tada!" | STATS var = AVG(woof)');
      });

      it('appends a filter in where clause in an existing query containing a stats command with a where command', () => {
        expect(
          appendFilteringWhereClauseForCascadeLayout(
            'from logstash-* | where country == "GR" | stats var = avg(woof) ',
            [],
            dataViewMock,
            'dest',
            'tada!',
            '+',
            'string'
          )
        ).toBe(
          'FROM logstash-* | WHERE dest == "tada!" AND country == "GR" | STATS var = AVG(woof)'
        );
      });
    });

    describe('handling for fields used in the operating stats command', () => {
      it('negates a filter in where clause in an existing query containing a stats command without a where command', () => {
        expect(
          appendFilteringWhereClauseForCascadeLayout(
            `FROM logstash-* | WHERE \`geo.dest\` == "BT" | SORT @timestamp DESC | LIMIT 10000 | STATS countB = COUNT(bytes) BY geo.dest | SORT countB`,
            [],
            dataViewMock,
            'geo.dest',
            'BT',
            '-',
            'string'
          )
        ).toBe(
          'FROM logstash-* | WHERE `geo.dest` == "BT" | SORT @timestamp DESC | LIMIT 10000 | WHERE `geo.dest` != "BT" | STATS countB = COUNT(bytes) BY geo.dest | SORT countB'
        );
      });

      it("accounts for case where there's a pre-existing where command that references a runtime field created in a previous stats command ", () => {
        expect(
          appendFilteringWhereClauseForCascadeLayout(
            'from logstash-* | sort @timestamp desc | limit 10000 | stats countB = count(bytes) by geo.dest | sort countB | where countB > 0',
            [],
            dataViewMock,
            'dest',
            'tada!',
            '+',
            'string'
          )
        ).toBe(
          'FROM logstash-* | WHERE dest == "tada!" | SORT @timestamp DESC | LIMIT 10000 | STATS countB = COUNT(bytes) BY geo.dest | SORT countB | WHERE countB > 0'
        );
      });

      it('handles the case where the field being filtered on is an unnamed function runtime field created by a stats command', () => {
        expect(
          appendFilteringWhereClauseForCascadeLayout(
            'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY CATEGORIZE(message), agent.keyword, clientip',
            [],
            dataViewMock,
            'CATEGORIZE(message)',
            'tada!',
            '+',
            'string'
          )
        ).toBe(
          'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY CATEGORIZE(message), agent.keyword, clientip | WHERE `CATEGORIZE(message)` == "tada!"'
        );
      });

      it('handles the case where the field being filtered on is a named function runtime field created by a stats command', () => {
        expect(
          appendFilteringWhereClauseForCascadeLayout(
            'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY Pattern = CATEGORIZE(message), agent.keyword, clientip',
            [],
            dataViewMock,
            'Pattern',
            'tada!',
            '+',
            'string'
          )
        ).toBe(
          'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY Pattern = CATEGORIZE(message), agent.keyword, clientip | WHERE Pattern == "tada!"'
        );
      });

      it('handles the case where the field being filtered on is a named function runtime field created by a stats command, followed by other commands', () => {
        expect(
          appendFilteringWhereClauseForCascadeLayout(
            'FROM kibana_sample_data_logs | WHERE clientip == "177.120.218.48" | STATS count = COUNT(bytes), average = AVG(memory) BY Pattern = CATEGORIZE(message), agent.keyword, clientip  | SORT count DESC',
            [],
            dataViewMock,
            'Pattern',
            'tada!',
            '+',
            'string'
          )
        ).toBe(
          'FROM kibana_sample_data_logs | WHERE clientip == "177.120.218.48" | STATS count = COUNT(bytes), average = AVG(memory) BY Pattern = CATEGORIZE(message), agent.keyword, clientip | WHERE Pattern == "tada!" | SORT count DESC'
        );
      });

      it('handles the case where the field being filtered on is a runtime field created by a stats command, and with another filter from the data source applied there after', () => {
        const initialFilterResult = appendFilteringWhereClauseForCascadeLayout(
          'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY Pattern = CATEGORIZE(message), agent.keyword | SORT count DESC',
          [],
          dataViewMock,
          'Pattern',
          'tada!',
          '+',
          'string'
        );

        expect(initialFilterResult).toBe(
          'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY Pattern = CATEGORIZE(message), agent.keyword | WHERE Pattern == "tada!" | SORT count DESC'
        );

        expect(
          appendFilteringWhereClauseForCascadeLayout(
            initialFilterResult,
            [],
            dataViewMock,
            'clientip',
            '192.168.1.1',
            '+',
            'string'
          )
        ).toBe(
          'FROM kibana_sample_data_logs | WHERE clientip == "192.168.1.1" | STATS count = COUNT(bytes), average = AVG(memory) BY Pattern = CATEGORIZE(message), agent.keyword | WHERE Pattern == "tada!" | SORT count DESC'
        );
      });

      it('handles the case where the operating stats command references a field from another stats command in its aggregation', () => {
        expect(
          appendFilteringWhereClauseForCascadeLayout(
            'FROM kibana_sample_data_logs | STATS count = COUNT(*) BY agent.keyword, extension.keyword | STATS avg = AVG(count) BY agent.keyword',
            [],
            dataViewMock,
            'agent.keyword',
            'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
            '+',
            'string'
          )
        ).toBe(
          'FROM kibana_sample_data_logs | WHERE `agent.keyword` == "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)" | STATS count = COUNT(*) BY agent.keyword, extension.keyword | STATS avg = AVG(count) BY agent.keyword'
        );
      });
    });

    describe('handling for param fields', () => {
      describe('column field group', () => {
        it("appends filter operation for a param field declared in the stats command column field group using it's param definition value before the driving stats command", () => {
          expect(
            appendFilteringWhereClauseForCascadeLayout(
              'FROM kibana_sample_data_logs  | STATS count = COUNT(bytes), average = AVG(memory) BY ??field | SORT average ASC',
              [
                {
                  key: 'field',
                  type: ESQLVariableType.FIELDS,
                  value: 'message',
                },
              ],
              dataViewMock,
              '??field',
              'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
              '+'
            )
          ).toBe(
            'FROM kibana_sample_data_logs | WHERE message == "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)" | STATS count = COUNT(bytes), average = AVG(memory) BY ??field | SORT average ASC'
          );
        });

        it('the query generated from a previous filter operation can be used as the input to a subsequent filter operation', () => {
          expect(
            appendFilteringWhereClauseForCascadeLayout(
              appendFilteringWhereClauseForCascadeLayout(
                'FROM kibana_sample_data_logs  | STATS count = COUNT(bytes), average = AVG(memory) BY ??field | SORT average ASC',
                [
                  {
                    key: 'field',
                    type: ESQLVariableType.FIELDS,
                    value: 'message',
                  },
                ],
                dataViewMock,
                '??field',
                'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
                '+'
              ),
              [
                {
                  key: 'field',
                  type: ESQLVariableType.FIELDS,
                  value: 'clientip',
                },
              ],
              dataViewMock,
              '??field',
              '192.168.1.1',
              '+',
              'string'
            )
          ).toBe(
            'FROM kibana_sample_data_logs | WHERE clientip == "192.168.1.1" AND message == "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)" | STATS count = COUNT(bytes), average = AVG(memory) BY ??field | SORT average ASC'
          );
        });
      });

      describe('function field group', () => {
        it('it correctly handles scenarios where a grouping function has whitespace between the function name and the opening parenthesis', () => {
          expect(
            appendFilteringWhereClauseForCascadeLayout(
              'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY CATEGORIZE (message) | SORT average ASC',
              [],
              dataViewMock,
              'CATEGORIZE (message)',
              'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
              '+'
            )
          ).toBe(
            'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY CATEGORIZE(message) | WHERE `CATEGORIZE(message)` == "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)" | SORT average ASC'
          );
        });

        it("appends filter operation for a param field declared in the stats command function field group using it's param definition value before the driving stats command", () => {
          expect(
            appendFilteringWhereClauseForCascadeLayout(
              'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY CATEGORIZE(??field) | SORT average ASC',
              [
                {
                  key: 'field',
                  type: ESQLVariableType.FIELDS,
                  value: 'message',
                },
              ],
              dataViewMock,
              'CATEGORIZE(??field)',
              'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
              '+'
            )
          ).toBe(
            'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY CATEGORIZE(??field) | WHERE `CATEGORIZE(??field)` == "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)" | SORT average ASC'
          );
        });

        it('appends filter operation for a named function field derived from a function group with a param argument before the driving stats command', () => {
          expect(
            appendFilteringWhereClauseForCascadeLayout(
              'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY Named = CATEGORIZE(??field) | SORT average ASC',
              [
                {
                  key: 'field',
                  type: ESQLVariableType.FIELDS,
                  value: 'message',
                },
              ],
              dataViewMock,
              'Named',
              'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)',
              '+'
            )
          ).toBe(
            'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY Named = CATEGORIZE(??field) | WHERE Named == "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322)" | SORT average ASC'
          );
        });
      });
    });

    describe('handling for fields that are not aggregatable', () => {
      it('uses match phrase query when the selected column is a text or keyword field that is not aggregatable', () => {
        // only apply this mock for this test
        jest.spyOn(dataViewMock.fields, 'getByName').mockReturnValueOnce({
          esTypes: ['text', 'keyword'],
          aggregatable: false,
        } as unknown as DataViewField);

        expect(
          appendFilteringWhereClauseForCascadeLayout(
            'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY tags',
            [],
            dataViewMock,
            'tags',
            'tada!',
            '+',
            'string'
          )
        ).toBe(
          'FROM kibana_sample_data_logs | WHERE MATCH_PHRASE(tags, "tada!") | STATS count = COUNT(bytes), average = AVG(memory) BY tags'
        );
      });
    });
  });
});
