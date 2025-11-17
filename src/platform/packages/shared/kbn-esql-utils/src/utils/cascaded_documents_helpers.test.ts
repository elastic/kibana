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
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import {
  getESQLStatsQueryMeta,
  constructCascadeQuery,
  mutateQueryStatsGrouping,
  appendFilteringWhereClauseForCascadeLayout,
} from './cascaded_documents_helpers';

describe('cascaded documents helpers utils', () => {
  describe('getESQLStatsQueryMeta', () => {
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

    it(`when the stats query provides unsupported functions as the by option, said functions should not be present in the returned metadata`, () => {
      const queryString = `FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY BUCKET(@timestamp, 1 hour), CATEGORIZE(bytes)`;

      const result = getESQLStatsQueryMeta(queryString);

      expect(result.groupByFields).toEqual([
        {
          field: 'CATEGORIZE(bytes)',
          type: 'categorize',
        },
      ]);
      expect(result.appliedFunctions).toEqual([{ identifier: 'var0', aggregation: 'AVG' }]);
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
  });

  describe('constructCascadeQuery', () => {
    describe('leaf queries', () => {
      const nodeType = 'leaf';

      describe('record field column group operations', () => {
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
            'FROM kibana_sample_data_logs | WHERE clientip == "192.168.1.1"'
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
            'FROM kibana_sample_data_logs | WHERE `url.keyword` == "https://www.elastic.co/downloads/beats/metricbeat"'
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
            'FROM remote_cluster:traces* | EVAL event = CASE(span.duration.us > 100000, "Bad", "Good") | WHERE event == "Bad"'
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
            'FROM kibana_sample_data_logs | WHERE bytes == "some value"'
          );
        });

        it('uses match phrase query when the selected column is a text or keyword field that is not aggregatable', () => {
          const editorQuery: AggregateQuery = {
            esql: `
              FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY message
            `,
          };

          const nodePath = ['tags'];
          const nodePathMap = { tags: 'some random pattern' };

          // only apply this mock for this test
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
      });

      describe('function group operations', () => {
        describe('categorize operation', () => {
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
              'FROM kibana_sample_data_logs | WHERE @timestamp <= ?_tend AND @timestamp > ?_tstart | SAMPLE 0.001 | WHERE MATCH(message, "some random pattern", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})'
            );
          });

          it('should construct a valid cascade query for an un-named categorize operation with a function as the argument', () => {
            const editorQuery: AggregateQuery = {
              esql: `
                FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY CATEGORIZE(TO_UPPER(message))
              `,
            };

            const nodePath = ['CATEGORIZE(TO_UPPER(message))'];
            const nodePathMap = { 'CATEGORIZE(TO_UPPER(message))': 'some random pattern' };

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
                FROM kibana_sample_data_logs | STATS var0 = AVG(bytes) BY Pattern = CATEGORIZE(TO_UPPER(message))
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

  describe('mutateQueryStatsGrouping', () => {
    it('should return a valid query that only contains the root group by column in the stats by option', () => {
      const editorQuery: AggregateQuery = {
        esql: `
          FROM kibana_sample_data_logs
            | STATS count = COUNT(bytes), average = AVG(memory)
              BY CATEGORIZE(message), agent.keyword, url.keyword
        `,
      };

      const result = mutateQueryStatsGrouping(editorQuery, ['agent.keyword']);

      expect(result.esql).toBe(
        'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY agent.keyword'
      );
    });

    it('should return a valid query that only contains the root group by column in the stats by option when the root group is a named function', () => {
      const editorQuery: AggregateQuery = {
        esql: `
          FROM kibana_sample_data_logs
            | STATS Count=COUNT(*) BY Pattern=CATEGORIZE(message), agent.keyword, url.keyword
        `,
      };

      const result = mutateQueryStatsGrouping(editorQuery, ['Pattern']);

      expect(result.esql).toBe(
        'FROM kibana_sample_data_logs | STATS Count = COUNT(*) BY Pattern = CATEGORIZE(message)'
      );
    });

    it('should return the original query if the root group is the only column in the stats by option', () => {
      const editorQuery: AggregateQuery = {
        esql: `
          FROM kibana_sample_data_logs
          | STATS COUNT() BY clientip
          | LIMIT 100
        `,
      };

      const result = mutateQueryStatsGrouping(editorQuery, ['clientip']);

      expect(result.esql).toBe(
        'FROM kibana_sample_data_logs | STATS COUNT() BY clientip | LIMIT 100'
      );
    });

    it('ignores specified columns to pick that are not present in the stats by option', () => {
      const editorQuery: AggregateQuery = {
        esql: `
          FROM kibana_sample_data_logs
            | STATS count = COUNT(bytes), average = AVG(memory)
              BY CATEGORIZE(message), agent.keyword, url.keyword
        `,
      };

      const result = mutateQueryStatsGrouping(editorQuery, ['non_existent_column']);

      expect(result.esql).toBe(
        'FROM kibana_sample_data_logs | STATS count = COUNT(bytes), average = AVG(memory) BY CATEGORIZE(message), agent.keyword, url.keyword'
      );
    });
  });

  describe('appendFilteringWhereClauseForCascadeLayout', () => {
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
      ).toBe('FROM logstash-* | WHERE dest == "tada!" AND country == "GR" | STATS var = AVG(woof)');
    });

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

    it('handles the case where the field being filtered on is a runtime field created by a stats command', () => {
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

    it('handles the case where the field being filtered on is a runtime field created by a stats command, followed by other commands', () => {
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
  });
});
