/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EsClient } from '@codesearch/esqueue';

import { Repository } from '../../model';
import {
  RepositoryIndexNamePrefix,
  RepositoryReservedField,
  RepositoryTypeName,
} from '../indexer/schema';
import { Poller } from '../poller';

export abstract class AbstractScheduler {
  private poller: Poller;

  constructor(protected readonly client: EsClient, pollFrequencyMs: number) {
    this.poller = new Poller({
      functionToPoll: () => {
        return this.schedule();
      },
      pollFrequencyInMillis: pollFrequencyMs,
      trailing: true,
      continuePollingOnError: true,
      pollFrequencyErrorMultiplier: 2,
    });
  }

  public start() {
    this.poller.start();
  }

  public stop() {
    this.poller.stop();
  }

  protected schedule(): Promise<void> {
    return this.client
      .search({
        index: `${RepositoryIndexNamePrefix}*`,
        type: RepositoryTypeName,
        body: {
          query: {
            exists: {
              field: RepositoryReservedField,
            },
          },
        },
        from: 0,
        size: 10000,
      })
      .then((res: any) => {
        Array.from(res.hits.hits).map((hit: any) => {
          const repo: Repository = hit._source[RepositoryReservedField];
          this.executeSchedulingJob(repo);
        });
      });
  }

  protected async executeSchedulingJob(repo: Repository) {
    // This is an abstract class. Do nothing here. You should override this.
    return new Promise<any>((resolve, _) => {
      resolve();
    });
  }
}
