/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { KueryNode, nodeBuilder, toElasticsearchQuery } from '@kbn/es-query';
import type { EsClient, EsEventStreamEventDto } from './types';
import type {
  EventStreamClient,
  EventStreamClientFilterOptions,
  EventStreamClientFilterResult,
  EventStreamEvent,
  EventStreamLogger,
} from '../types';
import { EsEventStreamNames } from './es_event_stream_names';
import { EsEventStreamInitializer } from './init/es_event_stream_initializer';
import { eventToDto, dtoToEvent } from './util';

export interface EsEventStreamClientDependencies {
  baseName: string;
  kibanaVersion: string;
  logger: EventStreamLogger;
  esClient: Promise<EsClient>;
}

const sort: estypes.Sort = [
  {
    // By default we always sort by event timestamp descending.
    '@timestamp': {
      order: 'desc',
    },

    // Tie breakers for events with the same timestamp.
    subjectId: {
      order: 'desc',
    },
    objectId: {
      order: 'desc',
    },
    predicate: {
      order: 'desc',
    },
  },
];

export class EsEventStreamClient implements EventStreamClient {
  readonly #names: EsEventStreamNames;

  constructor(private readonly deps: EsEventStreamClientDependencies) {
    this.#names = new EsEventStreamNames(deps.baseName);
  }

  public async initialize(): Promise<void> {
    const initializer = new EsEventStreamInitializer({
      names: this.#names,
      kibanaVersion: this.deps.kibanaVersion,
      logger: this.deps.logger,
      esClient: this.deps.esClient,
    });
    await initializer.initialize();
  }

  public async writeEvents(events: EventStreamEvent[]): Promise<void> {
    if (events.length === 0) return;

    const esClient = await this.deps.esClient;
    const operations: Array<estypes.BulkOperationContainer | EsEventStreamEventDto> = [];

    for (const event of events) {
      const dto = eventToDto(event);

      operations.push({ create: {} }, dto);
    }

    const { errors } = await esClient.bulk(
      {
        index: this.#names.dataStream,
        operations,
      },
      {
        maxRetries: 0,
      }
    );

    if (errors) {
      throw new Error('Some events failed to be indexed.');
    }
  }

  public async tail(limit: number = 100): Promise<EventStreamEvent[]> {
    return (await this.filter({ limit })).events;
  }

  public async filter(
    options: EventStreamClientFilterOptions
  ): Promise<EventStreamClientFilterResult> {
    const esClient = await this.deps.esClient;
    const topLevelNodes: KueryNode[] = [];

    if (options.subject && options.subject.length) {
      topLevelNodes.push(
        nodeBuilder.or(
          options.subject.map(([type, id]) =>
            !id
              ? nodeBuilder.is('subjectType', type)
              : nodeBuilder.and([
                  nodeBuilder.is('subjectType', type),
                  nodeBuilder.is('subjectId', id),
                ])
          )
        )
      );
    }

    if (options.object && options.object.length) {
      topLevelNodes.push(
        nodeBuilder.or(
          options.object.map(([type, id]) =>
            !id
              ? nodeBuilder.is('objectType', type)
              : nodeBuilder.and([
                  nodeBuilder.is('objectType', type),
                  nodeBuilder.is('objectId', id),
                ])
          )
        )
      );
    }

    if (options.predicate && options.predicate.length) {
      topLevelNodes.push(
        nodeBuilder.or(options.predicate.map((type) => nodeBuilder.is('predicate', type)))
      );
    }

    if (options.transaction && options.transaction.length) {
      topLevelNodes.push(
        nodeBuilder.or(options.transaction.map((id) => nodeBuilder.is('txId', id)))
      );
    }

    if (options.from) {
      const from = new Date(options.from).toISOString();
      const node = nodeBuilder.range('@timestamp', 'gte', from);

      topLevelNodes.push(node);
    }

    if (options.to) {
      const to = new Date(options.to).toISOString();
      const node = nodeBuilder.range('@timestamp', 'lte', to);

      topLevelNodes.push(node);
    }

    const query = toElasticsearchQuery(nodeBuilder.and(topLevelNodes));
    const size = options.limit ?? 100;
    const request: estypes.SearchRequest = {
      index: this.#names.dataStream,
      query,
      sort,
      size,
      track_total_hits: false,
    };

    if (options.cursor) {
      request.search_after = JSON.parse(options.cursor);
    }

    const res = await esClient.search<EsEventStreamEventDto>(request);
    const events = res.hits.hits.map((hit) => dtoToEvent(hit._source!));
    const lastHit = res.hits.hits[res.hits.hits.length - 1];

    let cursor: string = '';

    if (events.length >= size && lastHit && lastHit.sort) {
      cursor = JSON.stringify(lastHit.sort);
    }

    return {
      cursor,
      events,
    };
  }
}
