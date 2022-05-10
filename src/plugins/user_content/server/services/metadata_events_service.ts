/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/core/server';

import { UserContentEventsStream, DepsFromPluginStart } from '../types';
import { EVENTS_COUNT_GRANULARITY, UserContentMetadataEvent } from '../../common';
import { bucketsAggregationToContentEventCount, incrementViewsCounters } from '../lib';

export class MetadataEventsService {
  private logger: Logger;
  private depsFromPluginStartPromise: Promise<DepsFromPluginStart> | undefined;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  init({
    depsFromPluginStartPromise,
  }: {
    depsFromPluginStartPromise: Promise<DepsFromPluginStart>;
  }) {
    this.depsFromPluginStartPromise = depsFromPluginStartPromise;
  }

  async registerEvent(event: UserContentMetadataEvent) {
    if (!this.depsFromPluginStartPromise) {
      return;
    }

    const { userContentEventsStream, savedObjectRepository } = await this
      .depsFromPluginStartPromise;

    if (isViewedEvent(event)) {
      incrementViewsCounters(event.data.so_type, event.data.so_id, savedObjectRepository);
    }

    return userContentEventsStream.registerEvent(event);
  }

  async bulkRegisterEvents(events: UserContentMetadataEvent[]) {
    if (!this.depsFromPluginStartPromise) {
      return;
    }

    const { userContentEventsStream, savedObjectRepository } = await this
      .depsFromPluginStartPromise;

    events.filter(isViewedEvent).forEach(({ data: { so_type: soType, so_id: soId } }) => {
      incrementViewsCounters(soType, soId, savedObjectRepository);
    });

    return userContentEventsStream.bulkRegisterEvents(events);
  }

  async updateViewCounts() {
    if (!this.depsFromPluginStartPromise) {
      throw new Error(`Plugin start dependencies not provided.`);
    }

    // 1. TODO load snapshot

    // 2. If no snapshot load events since snapshot otherwise load all events
    const { userContentEventsStream } = await this.depsFromPluginStartPromise;

    try {
      const { buckets, hits } = await this.fetchEventsCount(
        ['viewed:kibana', 'viewed:api'],
        userContentEventsStream
      );

      return bucketsAggregationToContentEventCount(
        buckets,
        hits,
        EVENTS_COUNT_GRANULARITY as unknown as number[]
      );
    } catch (e) {
      this.logger.error(e);
      return 'error';
    }
  }

  private async fetchEventsCount(events: string[], eventStream: UserContentEventsStream) {
    /**
     * NOTE: This logic is for the POC. We might want to paginate this search
     * and bulk update the saved object event counter on a limited dataset
     */

    const maxDays = EVENTS_COUNT_GRANULARITY.reduce((agg, val) => {
      return val > agg ? val : agg;
    }, 0);

    const query: estypes.QueryDslQueryContainer = {
      bool: {
        must: [
          {
            terms: {
              // We are only interested in "viewed" event.type
              type: events,
            },
          },
          {
            range: {
              // No need to go further in time than our max days of aggregation
              '@timestamp': {
                gte: `now-${maxDays}d`,
              },
            },
          },
        ],
      },
    };

    const ranges = EVENTS_COUNT_GRANULARITY.map((day) => ({ from: `now-${day}d` }));

    const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
      userContent: {
        terms: {
          field: 'data.so_id',
        },
        aggs: {
          eventsCount: {
            range: {
              field: '@timestamp',
              ranges,
            },
          },
        },
      },
    };

    const result = (await eventStream.search({
      // @ts-expect-error Query should be declared at the root and not under "body"
      query,
      aggs,
      // For the POC we set this huge limit. We should optimize this and create 2 daily snapshots
      // so we will only need to fetch the last day of events
      size: 10000,
    })) as estypes.SearchResponse<UserContentMetadataEvent>;

    const { buckets } = result.aggregations!
      .userContent as estypes.AggregationsStringTermsAggregate;

    return { buckets: buckets as estypes.AggregationsStringTermsBucket[], hits: result.hits.hits };
  }
}

const isViewedEvent = ({ type }: UserContentMetadataEvent) => type.startsWith('viewed');
