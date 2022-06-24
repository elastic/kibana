/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

interface ClientOptions {
  node: string;
  username: string;
  password: string;
}

interface Labels {
  journeyName: string;
  maxUsersCount: string;
}

interface Request {
  method: string;
  headers: string;
  body?: { original: string };
}

interface Response {
  status_code: number;
}

interface Transaction {
  id: string;
  name: string;
  type: string;
  duration: { us: number };
}

export interface Document {
  labels: Labels;
  character: string;
  quote: string;
  service: { version: string };
  processor: string;
  trace: { id: string };
  '@timestamp': string;
  environment: string;
  url: { path: string };
  http: {
    request: Request;
    response: Response;
  };
  transaction: Transaction;
}

const addBooleanFilter = (filter: { field: string; value: string }): QueryDslQueryContainer => {
  return {
    bool: {
      should: [
        {
          match_phrase: {
            [filter.field]: filter.value,
          },
        },
      ],
      minimum_should_match: 1,
    },
  };
};

const addRangeFilter = (range: { startTime: string; endTime: string }): QueryDslQueryContainer => {
  return {
    range: {
      '@timestamp': {
        format: 'strict_date_optional_time',
        gte: range.startTime,
        lte: range.endTime,
      },
    },
  };
};

export function initClient(options: ClientOptions) {
  const client = new Client({
    node: options.node,
    auth: {
      username: options.username,
      password: options.password,
    },
  });

  return {
    async getKibanaServerTransactions(
      buildId: string,
      journeyName: string,
      range?: { startTime: string; endTime: string }
    ) {
      const filters = [
        { field: 'transaction.type', value: 'request' },
        { field: 'processor.event', value: 'transaction' },
        { field: 'labels.testBuildId', value: buildId },
        { field: 'labels.journeyName', value: journeyName },
      ];
      const queryFilters = filters.map((filter) => addBooleanFilter(filter));
      if (range) {
        queryFilters.push(addRangeFilter(range));
      }
      return await this.getTransactions(queryFilters);
    },
    async getFtrTransactions(buildId: string, journeyName: string) {
      const filters = [
        { field: 'service.name', value: 'functional test runner' },
        { field: 'processor.event', value: 'transaction' },
        { field: 'labels.testBuildId', value: buildId },
        { field: 'labels.journeyName', value: journeyName },
        { field: 'labels.performancePhase', value: 'TEST' },
      ];
      const queryFilters = filters.map((filter) => addBooleanFilter(filter));
      return await this.getTransactions(queryFilters);
    },
    async getTransactions(queryFilters: QueryDslQueryContainer[]) {
      const result = await client.search<Document>({
        body: {
          track_total_hits: true,
          sort: [
            {
              '@timestamp': {
                order: 'asc',
                unmapped_type: 'boolean',
              },
            },
          ],
          size: 10000,
          stored_fields: ['*'],
          _source: true,
          query: {
            bool: {
              must: [],
              filter: [
                {
                  bool: {
                    filter: queryFilters,
                  },
                },
              ],
              should: [],
              must_not: [],
            },
          },
        },
      });
      return result?.hits?.hits;
    },
  };
}
