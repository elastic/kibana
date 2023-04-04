/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { errors } from '@elastic/elasticsearch';
import type { IndicesGetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import pRetry from 'p-retry';

import type { IndexMapping } from '../../mappings';
import { getModelVersionsFromMappings } from '../model_version_from_mappings';
import type { ModelVersionMap } from '../version_map';

export interface Dependencies {
  client: ElasticsearchClient;
  logger: Logger;
  /**
   * How long to wait before polling again.
   *
   * @note this does not gaurantee polling will occur every `pollInterval` ms, but rather
   *       after a poll has occurred we will wait at least `pollInterval` ms before polling again.
   */
  pollInterval?: number;
}

const POLL_INTERVAL_MS = 30_000;
const KIBANA_SYSTEM_INDICES_PATTERN = '.kibana_*';

async function robustlyFetchIndices(client: ElasticsearchClient): Promise<IndicesGetResponse> {
  const run = async () => {
    try {
      return client.indices.get({
        index: KIBANA_SYSTEM_INDICES_PATTERN,
        expand_wildcards: 'hidden',
      });
    } catch (e) {
      if (
        e instanceof errors.ResponseError &&
        typeof e.statusCode === 'number' &&
        e.statusCode >= 400 &&
        e.statusCode < 500
      ) {
        throw new pRetry.AbortError(e);
      }
      throw e;
    }
  };

  return await pRetry(run, { retries: 5, maxTimeout: 10_000 });
}

/**
 * A singleton class that can be used to observe the current model version.
 *
 * @remark
 * Wraps a polling implementation that will:
 *
 * (1) Run a request against Elasticsearch for Kibana system indices. For a
 *     class of bad responses will retry up to 5 times with backoff.
 * (2) Build a model version map and emit this value
 * (3) Wait for `pollInterval` ms before repeating the process.
 *
 * Any failed poll attempts will be logged.
 */
export class ModelVersionObserver {
  private static instance: undefined | ModelVersionObserver;
  public static from({ client, logger, pollInterval }: Dependencies) {
    if (ModelVersionObserver.instance === undefined) {
      ModelVersionObserver.instance = new ModelVersionObserver(
        client,
        logger.get('model-version-observer'),
        pollInterval
      );
    }
    return ModelVersionObserver.instance;
  }

  public readonly modelVersionMap$: Rx.Observable<ModelVersionMap>;

  protected constructor(
    private readonly client: ElasticsearchClient,
    private readonly logger: Logger,
    private readonly pollInterval: number = POLL_INTERVAL_MS
  ) {
    const observable = new Rx.Observable<ModelVersionMap>(this.producer.bind(this));
    this.modelVersionMap$ = observable.pipe(Rx.shareReplay({ bufferSize: 1, refCount: true }));
  }

  /**
   * Infinitely polls the cluster for Kibana system indices that may contain model versions.
   */
  private producer = (subscriber: Rx.Subscriber<ModelVersionMap>): Rx.TeardownLogic => {
    (async () => {
      while (true) {
        if (subscriber.closed) break;
        try {
          const indices = await robustlyFetchIndices(this.client);
          let modelVersionMap: ModelVersionMap = {};
          for (const { mappings } of Object.values(indices)) {
            // Is this a Kibana system index for an SO type?
            if (!mappings?._meta) continue;
            modelVersionMap = {
              ...modelVersionMap,
              ...getModelVersionsFromMappings({
                mappings: mappings as IndexMapping,
                source: 'mappingVersions',
              }),
            };
          }
          subscriber.next(modelVersionMap);
        } catch (e) {
          this.logger.error(`Failed to fetch model version map: ${e}`);
        }
        await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
      }
    })();

    return () => {
      if (!subscriber.closed) subscriber.complete();
    };
  };

  public async getCurrentModelVersion(): Promise<ModelVersionMap> {
    return await Rx.firstValueFrom(this.modelVersionMap$);
  }
}
