/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * This provides a mechanism for preventing multiple Kibana instances from
 * simultaneously running migrations on the same index. It synchronizes this
 * by creating / deleting a temporary index as essentially, an expensive, distributed
 * mutex.
 *
 * The reason we have to coordinate this, rather than letting each Kibana instance
 * perform duplicate work, is that if we allowed each Kibana to simply run migrations in
 * parallel, they would each try to reindex and each try to create the destination index.
 * If those indices already exist, it may be due to contention between multiple Kibana
 * instances (which is safe to ignore), but it may be due to a partially completed migration,
 * or someone tampering with the Kibana alias. In these cases, it's not clear that we should
 * just migrate data into an existing index. Such an action could result in data loss. Instead,
 * we should probably fail, and the Kibana sys-admin should clean things up before relaunching
 * Kibana.
*/

import _ from 'lodash';
import { ElasticIndex } from './elastic_index';
import { Logger } from './migration_logger';
import { CallCluster } from './types';

const DEFAULT_POLL_INTERVAL = 15000;

interface Opts {
  callCluster: CallCluster;
  index: string;
  log: Logger;
  pollInterval?: number;
}

/**
 * Coordinates the running of a function such that it will only run in one Kibana
 * instance at a time.
 *
 * @export
 * @class MigrationCoordinator
 */
export class MigrationCoordinator {
  private lockIndex: ElasticIndex;
  private index: string;
  private log: Logger;
  private pollInterval: number;

  // If the lock is already held by someone else, we want to make sure to log this,
  // as it could indicate a previous migration exited ungracefully and needs to be
  // cleaned up. But we only want to log it once, so we don't spam the logs while polling.
  private warnLockExists = _.once((error?: object) => {
    const { index, lockIndex, log } = this;

    log.warning(
      `Migration of index "${index}" appears to be underway. ` +
        `If migrations are not underway, you can delete the lock index "${lockIndex}" ` +
        `and restart Kibana. ` +
        `${error ? JSON.stringify(error) : ''}`
    );
  });

  constructor(opts: Opts) {
    this.lockIndex = new ElasticIndex({
      callCluster: opts.callCluster,
      index: `${opts.index}_migration_lock`,
    });
    this.index = opts.index;
    this.log = opts.log;
    this.pollInterval = opts.pollInterval || DEFAULT_POLL_INTERVAL;
  }

  /**
   * Waits for opts.run to complete. If opts.run is running on an other instance, this
   * will wait for that to complete before attempting to run locally.
   *
   * @returns {Promise<void>}
   * @memberof MigrationCoordinator
   */
  public async run(fn: () => Promise<any>) {
    while (true) {
      const lock = await this.acquireLock();

      if (lock) {
        return fn().then(lock.release);
      }

      await sleep(this.pollInterval);
    }
  }

  /**
   * Attempt to create the lock index, and fail gracfully if it already exists.
   */
  private async acquireLock() {
    const { lockIndex, log } = this;
    const lockAcquired = await lockIndex.create();

    if (!lockAcquired) {
      return this.warnLockExists();
    }

    return {
      release: () => lockIndex.deleteIndex(),
    };
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
