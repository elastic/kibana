/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { QueryDslQueryContainer, SearchHit, Sort } from '@elastic/elasticsearch/lib/api/types';
import { SearchRequest, MsearchRequestItem } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ToolingLog } from '@kbn/tooling-log';

interface ClientOptions {
  node: string;
  username: string;
  password: string;
}

export interface Headers {
  readonly [key: string]: string[];
}

interface Request {
  method: string;
  headers: Headers;
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
  span_count: { started: number };
}

interface Filter {
  field: string;
  value: string;
}

export interface Doc {
  '@timestamp': string;
  labels?: { journeyName: string; maxUsersCount: string };
  parent?: { id: string };
  service: { name: string; environment: string };
  trace: { id: string };
  transaction: Transaction;
}

export interface SpanDoc extends Omit<Doc, 'transaction'> {
  transaction: { id: string };
  span: {
    id: string;
    name: string;
    action: string;
    duration: { us: number };
    db?: { statement?: string };
  };
}

export interface TransactionDoc extends Omit<Doc, 'service'> {
  service: { name: string; environment: string; version: string };
  processor: string;
  url: { path: string; query?: string };
  http: {
    request: Request;
    response: Response;
  };
}

export interface Step {
  name: string;
  startTime: string;
  endTime: string;
}

export interface StepTransactions extends Step {
  transactions: Array<SearchHit<TransactionDoc>>;
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

const getQuery = (queryFilters: QueryDslQueryContainer[]): QueryDslQueryContainer => {
  return {
    bool: {
      filter: [
        {
          bool: {
            filter: queryFilters,
          },
        },
      ],
    },
  };
};

const getSort = (): Sort => {
  return [
    {
      '@timestamp': {
        order: 'asc',
        unmapped_type: 'boolean',
      },
    },
  ];
};

export class ESClient {
  client: Client;
  log: ToolingLog;
  tracesIndex: string = '.ds-traces-apm-default*';
  defaultDocSize: number = 1000;

  constructor(options: ClientOptions, log: ToolingLog) {
    this.client = new Client({
      node: options.node,
      auth: {
        username: options.username,
        password: options.password,
      },
    });
    this.log = log;
  }

  async getTransactions<T>(queryFilters: QueryDslQueryContainer[]) {
    const searchRequest: SearchRequest = {
      index: this.tracesIndex,
      body: {
        sort: getSort(),
        size: this.defaultDocSize,
        query: getQuery(queryFilters),
      },
    };

    this.log.debug(`Search request: ${JSON.stringify(searchRequest)}`);
    const result = await this.client.search<T>(searchRequest);
    this.log.debug(`Search result: ${JSON.stringify(result)}`);
    return result?.hits?.hits;
  }

  async getFtrServiceDocs<T>(
    buildId: string,
    journeyName: string,
    extraFilters?: Filter[]
  ): Promise<Array<SearchHit<T>>> {
    const filters = [
      { field: 'service.name', value: 'functional test runner' },
      { field: 'labels.testBuildId', value: buildId },
      { field: 'labels.journeyName', value: journeyName },
      { field: 'labels.performancePhase', value: 'TEST' },
    ];
    if (extraFilters && extraFilters.length > 0) {
      filters.push(...extraFilters);
    }
    const queryFilters = filters.map((filter) => addBooleanFilter(filter));
    return await this.getTransactions<T>(queryFilters);
  }

  async getJourneyTransactions(buildId: string, journeyName: string) {
    const extraFilters = [{ field: 'processor.event', value: 'transaction' }];
    return await this.getFtrServiceDocs<Doc>(buildId, journeyName, extraFilters);
  }

  async getJourneySteps(buildId: string, journeyName: string) {
    const extraFilters = [
      { field: 'processor.event', value: 'span' },
      { field: 'span.type', value: 'step' },
    ];
    return await this.getFtrServiceDocs<SpanDoc>(buildId, journeyName, extraFilters);
  }

  getMsearchRequestItem = (queryFilters: QueryDslQueryContainer[]): MsearchRequestItem => {
    return {
      sort: getSort(),
      size: this.defaultDocSize,
      query: getQuery(queryFilters),
    };
  };

  async mSearch<T>(searches: MsearchRequestItem[]): Promise<Array<Array<SearchHit<T>>>> {
    this.log.debug(`Msearch request: ${JSON.stringify(searches)}`);
    const result = await this.client.msearch<T>({
      searches,
    });
    this.log.debug(`Msearch result: ${JSON.stringify(result)}`);
    return result.responses.map((response) => {
      if ('error' in response) {
        throw new Error(`Msearch failure: ${JSON.stringify(response.error)}`);
      } else if (response.hits.hits.length > 0) {
        return response.hits.hits;
      } else {
        return [];
      }
    });
  }

  async getSpans(transactionIds: string[]) {
    const searches = new Array<MsearchRequestItem>();

    for (const transactionId of transactionIds) {
      const filters = [{ field: 'parent.id', value: transactionId }];
      const queryFilters = filters.map((filter) => addBooleanFilter(filter));
      const requestItem = this.getMsearchRequestItem(queryFilters);
      searches.push({ index: this.tracesIndex }, requestItem);
    }

    const responses = await this.mSearch<SpanDoc>(searches);

    return responses.flatMap((response) => response);
  }

  async getKibanaServerTransactions(
    buildId: string,
    journeyName: string,
    steps: Step[]
  ): Promise<StepTransactions[]> {
    const filters = [
      { field: 'transaction.type', value: 'request' },
      { field: 'processor.event', value: 'transaction' },
      { field: 'labels.testBuildId', value: buildId },
      { field: 'labels.journeyName', value: journeyName },
    ];
    const searches = new Array<MsearchRequestItem>();

    for (const step of steps) {
      const queryFilters = filters.map((filter) => addBooleanFilter(filter));
      queryFilters.push(addRangeFilter({ startTime: step.startTime, endTime: step.endTime }));
      const requestItem = this.getMsearchRequestItem(queryFilters);
      searches.push({ index: this.tracesIndex }, requestItem);
    }

    const responses = await this.mSearch<TransactionDoc>(searches);

    return steps.map((step, index) => {
      return {
        ...step,
        transactions: responses[index],
      };
    });
  }
}
