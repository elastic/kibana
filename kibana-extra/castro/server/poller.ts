/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Borrowed from https://github.com/elastic/kibana/blob/master/x-pack/common/poller.js
 */

import { clearTimeout, setTimeout } from 'timers';

const noop = () => {
  // noop
};

interface PollerOptions<T> {
  pollFrequencyInMillis: number;
  functionToPoll: Poller<T>['functionToPoll'];
  successFunction?: Poller<T>['successFunction'];
  errorFunction?: Poller<T>['errorFunction'];
  trailing?: boolean;
  continuePollingOnError?: boolean;
  pollFrequencyErrorMultiplier?: number;
}

export class Poller<T = void> {
  private readonly pollFrequencyInMillis: number;
  private readonly functionToPoll: () => Promise<T>;
  private readonly successFunction: (result: T) => Promise<void> | void;
  private readonly errorFunction: (error: Error) => Promise<void> | void;
  private readonly trailing: boolean;
  private readonly continuePollingOnError: boolean;
  private readonly pollFrequencyErrorMultiplier: number;

  private timeoutId?: ReturnType<typeof setTimeout>;

  constructor(options: PollerOptions<T>) {
    this.functionToPoll = options.functionToPoll; // Must return a Promise
    this.successFunction = options.successFunction || noop;
    this.errorFunction = options.errorFunction || noop;
    this.pollFrequencyInMillis = options.pollFrequencyInMillis;
    this.trailing = options.trailing || false;
    this.continuePollingOnError = options.continuePollingOnError || false;
    this.pollFrequencyErrorMultiplier = options.pollFrequencyErrorMultiplier || 1;
  }

  public getPollFrequency() {
    return this.pollFrequencyInMillis;
  }

  public start() {
    if (this.isRunning()) {
      return;
    }

    if (this.trailing) {
      this.timeoutId = setTimeout(this.poll.bind(this), this.pollFrequencyInMillis);
    } else {
      this.poll();
    }
  }

  public stop() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  public isRunning() {
    return !!this.timeoutId;
  }

  private async poll() {
    try {
      await this.successFunction(await this.functionToPoll());

      if (!this.isRunning()) {
        return;
      }

      this.timeoutId = setTimeout(this.poll.bind(this), this.pollFrequencyInMillis);
    } catch (error) {
      await this.errorFunction(error);

      if (!this.isRunning()) {
        return;
      }

      if (this.continuePollingOnError) {
        this.timeoutId = setTimeout(
          this.poll.bind(this),
          this.pollFrequencyInMillis * this.pollFrequencyErrorMultiplier
        );
      } else {
        this.stop();
      }
    }
  }
}
