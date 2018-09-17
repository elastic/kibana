/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EsClient } from '@codesearch/esqueue';

import { Repository } from '../../model';
import {
  RepositoryIndexNamePrefix,
  RepositoryReserviedField,
  RepositoryTypeName,
} from '../indexer/schema';
import { Poller } from '../poller';

export abstract class AbstractScheduler {
  protected POLL_FREQUENCY_MS: number = 60 * 1000;
  private poller: Poller;

  constructor(private readonly client: EsClient) {
    this.poller = new Poller({
      functionToPoll: () => {
        return this.schedule();
      },
      pollFrequencyInMillis: this.POLL_FREQUENCY_MS,
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
              field: RepositoryReserviedField,
            },
          },
        },
        from: 0,
        size: 10000,
      })
      .then((res: any) => {
        Array.from(res.hits.hits).map((hit: any) => {
          const repo: Repository = hit._source[RepositoryReserviedField];
          this.executeJob(repo);
        });
      });
  }

  protected async executeJob(repo: Repository) {
    // This is an abstract class. Do nothing here. You should override this.
    return new Promise<any>((resolve, _) => {
      resolve();
    });
  }
}
