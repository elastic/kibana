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
 * This module contains the logic for polling the task manager index for new work.
 */

import { Logger } from './lib/logger';

type WorkFn = () => Promise<void>;

interface Opts {
  pollInterval: number;
  logger: Logger;
  work: WorkFn;
}

/**
 * Performs work on a scheduled interval, logging any errors. This waits for work to complete
 * (or error) prior to attempting another run.
 */
export class TaskPoller {
  private isStarted = false;
  private isWorking = false;
  private timeout: any;
  private pollInterval: number;
  private logger: Logger;
  private work: WorkFn;

  /**
   * Constructs a new TaskPoller.
   *
   * @param opts
   * @prop {number} pollInterval - How often, in milliseconds, we will run the work function
   * @prop {Logger} logger - The task manager logger
   * @prop {WorkFn} work - An empty, asynchronous function that performs the desired work
   */
  constructor(opts: Opts) {
    this.pollInterval = opts.pollInterval;
    this.logger = opts.logger;
    this.work = opts.work;
  }

  /**
   * Starts the poller. If the poller is already running, this has no effect.
   */
  public start() {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;

    const poll = async () => {
      await this.attemptWork();

      if (this.isStarted) {
        this.timeout = setTimeout(poll, this.pollInterval);
      }
    };

    poll();
  }

  /**
   * Stops the poller.
   */
  public stop() {
    this.isStarted = false;
    clearTimeout(this.timeout);
    this.timeout = undefined;
  }

  /**
   * Runs the work function. If the work function is currently running,
   * this has no effect.
   */
  public async attemptWork() {
    if (this.isWorking) {
      return;
    }

    this.isWorking = true;

    try {
      await this.work();
    } catch (error) {
      this.logger.error(`Failed to poll for work ${error.stack}`);
    } finally {
      this.isWorking = false;
    }
  }
}
