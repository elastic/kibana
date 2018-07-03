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
import { CallCluster, LogFn } from './types';

type CoordinatedFn = () => Promise<any>;

interface Opts {
  callCluster: CallCluster;
  index: string;
  log: LogFn;
  pollInterval: number;
  run: CoordinatedFn;
}

/**
 * Coordinates the running of `opts.run` such that it will only run in once Kibana
 * instance at a time.
 *
 * @export
 * @class MigrationCoordinator
 */
export class MigrationCoordinator {
  private callCluster: CallCluster;
  private index: string;
  private log: LogFn;
  private pollInterval: number;
  private run: CoordinatedFn;
  private tmpIndex: string;

  // If the lock is already held by someone else, we want to make sure to log this,
  // as it could indicate a previous migration exited ungracefully and needs to be
  // cleaned up. But we only want to log it once, so we don't spam the logs while polling.
  private warnLockExists = _.once((error?: object) => {
    const { index, log, tmpIndex } = this;

    log(
      ['warn', 'migrations'],
      `Migration of index "${index}" appears to be underway. ` +
        `If migrations are not underway, you can delete the lock index "${tmpIndex}".` +
        `and restart Kibana. ${error ? JSON.stringify(error) : ''}`
    );
  });

  /**
   * Creates an instance of MigrationCoordinator.
   *
   * @param {Opts} opts
   * @prop {CallCluster} callCluster - The elasticsearch connection
   * @prop {string} index - The index being migrated
   * @prop {function} log - The logger
   * @prop {number} pollInterval - How often, in ms, we attempt to get a lock on the migration
   * @prop {function} run - The function to be run one Kibana instance at a time
   * @memberof MigrationCoordinator
   */
  constructor(opts: Opts) {
    this.callCluster = opts.callCluster;
    this.index = opts.index;
    this.log = opts.log;
    this.pollInterval = opts.pollInterval;
    this.run = opts.run;
    this.tmpIndex = `${opts.index}_migration_lock`;
  }

  /**
   * Waits for opts.run to complete. If opts.run is running on an other instance, this
   * will wait for that to complete before attempting to run locally.
   *
   * @returns {Promise<void>}
   * @memberof MigrationCoordinator
   */
  public async waitForCompletion() {
    while (true) {
      const lock = await this.acquireLock();

      if (lock) {
        return this.run().then(lock.release);
      }

      await sleep(this.pollInterval);
    }
  }

  /**
   * Attempt to create the lock index, and fail gracfully if it already exists.
   */
  private async acquireLock() {
    const { callCluster, tmpIndex } = this;

    // Someone else owns the lock
    if (await callCluster('indices.exists', { index: tmpIndex })) {
      return this.warnLockExists();
    }

    // Attempt to create the lock, handling the case where the lock already exists
    try {
      await callCluster('indices.create', { index: tmpIndex });
      return {
        release: () => callCluster('indices.delete', { index: tmpIndex }),
      };
    } catch (error) {
      // Someone else owns the lock
      if (lockAlreadyExists(error)) {
        return this.warnLockExists(error);
      }

      // Who knows what just happened? We better not swallow errors
      throw error;
    }
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function lockAlreadyExists(error: any) {
  return (
    _.get(error, 'body.error.type') === 'resource_already_exists_exception'
  );
}
