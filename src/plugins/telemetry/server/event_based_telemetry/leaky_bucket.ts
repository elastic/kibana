/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { Logger } from 'src/core/server';
import type { Observable, Subscription } from 'rxjs';
import { merge, timer } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import type { EventEnvelope, LeakyBucketConfig, HTTPSender } from './types';

export class LeakyBucket {
  private readonly maxWaitInMs = this.config.max_wait_time.asMilliseconds();
  private queue: Buffer[] = [];
  private lastSend = moment();
  private sendFailures = 0;
  private sending = false;
  private timer?: Subscription;
  private onGoingGenerator?: AsyncGenerator<EventEnvelope, void>;
  constructor(
    private readonly logger: Logger,
    private readonly config: LeakyBucketConfig,
    private readonly getGenerator: () => AsyncGenerator<EventEnvelope, void>,
    private readonly newEvents$: Observable<number>
  ) {}

  public start(sender: HTTPSender) {
    const intervalInMs = this.config.interval.asMilliseconds();
    this.timer = merge(timer(intervalInMs, intervalInMs), this.newEvents$)
      .pipe(throttleTime(1000)) // Make sure we don't call this more than once per second
      .subscribe(async () => {
        await this.sendIfDue(sender);
      });
  }

  public stop() {
    this.timer?.unsubscribe();
  }

  public async sendIfDue(sender: HTTPSender) {
    if (this.sending) return;

    this.sending = true;
    try {
      await this.sendIfFull(sender);

      this.onGoingGenerator = this.onGoingGenerator || this.getGenerator();
      do {
        // Retrieve elements and add them to the queue
        const { value, done } = await this.onGoingGenerator.next();
        if (value) {
          const buffer = Buffer.from(JSON.stringify(value));
          this.queue.push(buffer);
        }
        if (done) {
          // Generator is consumed, clearing it out.
          this.onGoingGenerator = void 0;
        }

        await this.sendIfFull(sender);
      } while (this.onGoingGenerator);

      if (this.hasMaxWaitExpired()) {
        await this.send(sender);
      }
    } catch (err) {
      this.logger.error(`Failed to send events: ${err.message}`);
    } finally {
      this.sending = false;
    }
  }

  private async sendIfFull(sender: HTTPSender) {
    if (this.isFullQueue()) {
      // To don't go over our "threshold bytes per second", we need to wait
      // {max_frequency_of_requests} before consuming from queues again.
      // Using Promise.allSettled because we don't want to add the sending
      // time to the {max_frequency_of_requests} wait, but we still want to wait if we fail to send.
      const [sendResults] = await Promise.allSettled([
        this.send(sender),
        new Promise((resolve) =>
          setTimeout(resolve, this.config.max_frequency_of_requests.asMilliseconds())
        ),
      ]);

      if (sendResults.status === 'rejected') {
        throw sendResults.reason;
      }
    }
  }

  private isFullQueue(): boolean {
    const queueSize = this.queue.reduce((acc, buffer) => acc + buffer.length, 0);
    return queueSize >= this.config.threshold.getValueInBytes();
  }

  private hasMaxWaitExpired(): boolean {
    const diff = moment().diff(this.lastSend, 'milliseconds');
    return diff >= this.maxWaitInMs;
  }

  private async send(sender: HTTPSender) {
    // No need to JSON.parse the events here because http requires strings anyway.
    const events = this.queue.map((buffer) => buffer.toString());
    try {
      this.logger.debug(`Sending ${events.length} events...`);
      await sender(events);
      // Clear the queue on success
      this.logger.debug(`Successfully sent ${events.length}. Clearing the queue.`);
      this.queue = [];
      this.lastSend = moment();
      this.sendFailures = 0;
    } catch (err) {
      if (++this.sendFailures > this.config.max_retries) {
        this.logger.debug(
          `Failed ${this.sendFailures}. Giving up and dropping all the events from the queue.`
        );
        this.queue = [];
        this.sendFailures = 0;
      }
      throw err;
    }
  }
}
