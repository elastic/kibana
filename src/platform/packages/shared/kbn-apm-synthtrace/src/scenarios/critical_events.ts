/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogDocument, Serializable } from '@kbn/apm-synthtrace-client';
import { SampleParserClient } from '@kbn/sample-log-parser';
import { StreamQuery } from '@kbn/streams-schema';
import { range as lodashRange, memoize, sum } from 'lodash';
import {
  LoghubQuery,
  createQueryMatcher,
  tokenize,
} from '@kbn/sample-log-parser/src/validate_queries';
import { StreamLogGenerator } from '@kbn/sample-log-parser/client/types';
import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<LogDocument> = async ({ from, to, ...runOptions }) => {
  const client = new SampleParserClient({ logger: runOptions.logger });

  const { rpm, profileOnly = false } = (runOptions.scenarioOpts ?? {}) as {
    rpm?: number;
    profileOnly?: boolean;
  };

  const generators = await client.getLogGenerators({
    rpm,
  });

  const log = runOptions.logger;

  const getQueryMatcher = memoize(
    (query: LoghubQuery) => {
      return createQueryMatcher(query.query);
    },
    (query) => query.id
  );

  const getMatchingQueryIds = ({
    message,
    generator: { queries },
  }: {
    message: string;
    generator: StreamLogGenerator;
  }) => {
    const input = { tokens: tokenize(message), raw: message };
    const matchingIds: string[] = [];
    for (const query of queries) {
      const matches = getQueryMatcher(query)(input);
      if (matches) {
        matchingIds.push(query.id);
      }
    }

    return matchingIds;
  };

  return {
    bootstrap: async ({ streamsClient }) => {
      log.info('Enabling streams');
      await streamsClient.enable();

      if (!profileOnly) {
        log.debug('Forking streams');

        for (const generator of generators) {
          const streamName = `logs.${generator.name.toLowerCase()}`;

          log.debug(`Forking ${streamName}`);

          await streamsClient.forkStream('logs', {
            stream: {
              name: streamName,
            },
            if: {
              field: 'filepath',
              operator: 'eq',
              value: generator.filepath,
            },
          });

          log.debug(`Installing critical events for ${streamName}`);

          await streamsClient.putStream(streamName, {
            dashboards: [],
            stream: {
              ingest: {
                lifecycle: {
                  inherit: {},
                },
                routing: [],
                processing: [],
                wired: {
                  fields: {
                    'critical_event.query_id': {
                      type: 'keyword',
                    },
                    'critical_event.rule_id': {
                      type: 'keyword',
                    },
                  },
                },
              },
            },
            queries: generator.queries.map((query): StreamQuery => {
              return {
                id: query.id,
                title: query.title,
                dsl: {
                  query: query.query,
                },
                type: 'critical_event',
              };
            }),
          });
        }

        log.info(`Completed bootstrapping of streams with critical events`);
      }
    },
    teardown: async ({ esClient }) => {
      const ranges = [0.25, 4, 24, 48]; // 15m, 4h, 24h, 48h

      const end = new Date(to).toISOString();

      const requests: Array<{
        name: string;
        request: SearchRequest;
        clearCache: boolean;
      }> = ranges
        .flatMap((range) => {
          const gte = moment(from).subtract(range, 'hours').toISOString();

          const timeRangeQuery: QueryDslQueryContainer = {
            range: {
              '@timestamp': {
                gte,
                lte: end,
              },
            },
          };

          const rangeLabel = range >= 1 ? `${range}h` : `${range * 60}m`;

          const requestsForRange: Array<SearchRequest & { name: string; clearCache: boolean }> = [
            {
              name: `top_10.${rangeLabel}`,
              size: 10,
            },
            {
              name: `total_hits.${rangeLabel}`,
              track_total_hits: true,
              size: 10,
            },
            {
              name: `date_histogram.${rangeLabel}`,
              size: 0,
              track_total_hits: false,
              aggs: {
                over_time: {
                  auto_date_histogram: {
                    field: '@timestamp',
                    buckets: 50,
                  },
                },
              },
            },
          ]
            .flatMap((request) => {
              return [
                {
                  ...request,
                  name: `source.${request.name}`,
                  index: `logs.*@critical_events_query.*`,
                  query: {
                    bool: {
                      filter: [timeRangeQuery],
                    },
                  },
                },
                {
                  ...request,
                  name: `alerts.${request.name}`,
                  index: `logs.*@critical_events_alerts.*`,
                  query: {
                    bool: {
                      filter: [timeRangeQuery],
                    },
                  },
                },
              ];
            })
            .flatMap((request) => {
              return [
                {
                  ...request,
                  name: `${request.name}.cache`,
                  clearCache: false,
                },
                {
                  ...request,
                  name: `${request.name}.no_cache`,
                  clearCache: true,
                },
              ];
            });

          return requestsForRange;
        })
        .map(({ name, clearCache, ...request }) => {
          return {
            name,
            clearCache,
            request: {
              ...request,
              request_cache: false,
              preference: 'foo',
            },
          };
        });

      const results: Array<{
        name: string;
        response_times: number[];
      }> = [];

      for (const { clearCache, name, request } of requests) {
        log.info(`Profiling ${name}`);
        await esClient.indices.clearCache();

        const resultsForQuery: Array<{ took: number }> = [];

        for (let i = 0; i < 10; i++) {
          if (clearCache) {
            await esClient.indices.clearCache();
          }

          const response = await esClient.search(request);

          log.verbose(`${name}: ${response.took}ms`);

          resultsForQuery.push({
            took: response.took,
          });

          await new Promise((resolve) => {
            setTimeout(resolve, 250);
          });
        }

        const tooks = resultsForQuery.map((response) => response.took);

        const total = sum(tooks);

        const avg = Math.round(total / tooks.length);

        log.debug(`${name}: avg ${avg}ms`);

        results.push({ name, response_times: tooks });
      }

      console.log(JSON.stringify(results));
    },
    generate: ({ range, clients: { streamsClient } }) => {
      if (profileOnly) {
        return [];
      }

      const start = range.from.getTime();
      const end = range.to.getTime();
      const ruleInterval = 3000 * 60 * 1;
      const maxAlerts = 100;

      const buckets = lodashRange(0, Math.ceil((end - start) / ruleInterval)).map((index) => {
        return {
          start: start + index * ruleInterval,
          end: start + ruleInterval + index * ruleInterval,
          count: {} as Record<string, number>,
        };
      });

      return withClient(
        streamsClient,
        range.interval('5s').generator((timestamp) => {
          const bucketIndex = Math.floor((timestamp - start) / ruleInterval);

          const bucket = buckets[bucketIndex];

          return generators.flatMap((generator) =>
            generator
              .next(timestamp)
              .map((doc) => {
                const matchingIds: string[] = getMatchingQueryIds({
                  message: doc.message,
                  generator,
                });

                const generatedAlertIds: string[] = [];

                matchingIds.forEach((id) => {
                  const current = bucket.count[id] || 0;
                  if (current < maxAlerts) {
                    generatedAlertIds.push(id);
                  }
                  bucket.count[id] = current + 1;
                });

                doc['critical_event.rule_id'] = generatedAlertIds;
                doc['critical_event.query_id'] = matchingIds;
                return doc;
              })
              .map((doc) => new Serializable(doc))
          );
        })
      );
    },
  };
};

export default scenario;
