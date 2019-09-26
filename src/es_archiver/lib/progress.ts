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

import { ToolingLog } from '@kbn/dev-utils';

const SECOND = 1000;

export class Progress {
  private total?: number;
  private complete?: number;
  private loggingInterval?: NodeJS.Timer;

  getTotal() {
    return this.total;
  }

  getComplete() {
    return this.complete;
  }

  getPercent() {
    if (this.complete === undefined || this.total === undefined) {
      return 0;
    }

    return Math.round((this.complete / this.total) * 100);
  }

  isActive() {
    return !!this.loggingInterval;
  }

  activate(log: ToolingLog) {
    if (this.loggingInterval) {
      throw new Error('Progress is already active');
    }

    // if the action takes longer than 10 seconds, log info about the transfer every 10 seconds
    this.loggingInterval = setInterval(() => {
      if (this.complete === undefined) {
        return;
      }

      if (this.total === undefined) {
        log.info('progress: %d', this.getComplete());
        return;
      }

      log.info('progress: %d/%d (%d%)', this.getComplete(), this.getTotal(), this.getPercent());
    }, 10 * SECOND);
  }

  deactivate() {
    if (!this.loggingInterval) {
      throw new Error('Progress is not active');
    }

    clearInterval(this.loggingInterval);
    this.loggingInterval = undefined;
  }

  addToTotal(n: number) {
    this.total = this.total === undefined ? n : this.total + n;
  }

  addToComplete(n: number) {
    this.complete = this.complete === undefined ? n : this.complete + n;
  }
}
