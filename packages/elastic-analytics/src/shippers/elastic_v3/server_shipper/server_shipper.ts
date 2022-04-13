/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
import { BehaviorSubject, filter, Subject, interval, exhaustMap, merge } from 'rxjs';
import type { IShipper } from '../../types';
import type { Event, EventContext, TelemetryCounter } from '../../../events';
import { TelemetryCounterType } from '../../../events';
import type { ElasticV3ShipperOptions } from '../types';
import type { AnalyticsClientInitContext } from '../../../analytics_client';
import { buildUrl, createTelemetryCounterHelper, eventsToNDJSON } from '../common';

const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const KIB = 1024;

export class ElasticV3ServerShipper implements IShipper {
  public static shipperName = 'elastic_v3_server';
  public readonly telemetryCounter$ = new Subject<TelemetryCounter>();

  private readonly reportTelemetryCounters = createTelemetryCounterHelper(
    this.telemetryCounter$,
    ElasticV3ServerShipper.shipperName
  );

  private readonly internalQueue: Event[] = [];
  private readonly shutdown$ = new Subject<void>();

  private readonly lastBatchSent$ = new BehaviorSubject<number>(Date.now());

  private clusterUuid: string = 'UNKNOWN';
  private licenseId?: string;
  private isOptedIn?: boolean;

  constructor(
    private readonly options: ElasticV3ShipperOptions,
    private readonly initContext: AnalyticsClientInitContext
  ) {
    this.setInternalSubscriber();
  }

  public extendContext(newContext: EventContext) {
    if (newContext.cluster_uuid) {
      this.clusterUuid = newContext.cluster_uuid;
    }
    if (newContext.license_id) {
      this.licenseId = newContext.license_id;
    }
  }

  public optIn(isOptedIn: boolean) {
    this.isOptedIn = isOptedIn;

    if (isOptedIn === false) {
      this.internalQueue.length = 0;
    }
  }

  public reportEvents(events: Event[]) {
    if (this.isOptedIn === false) {
      return;
    }

    const freeSpace = 1000 - this.internalQueue.length;

    // As per design, we only want store up-to 1000 events at a time. Drop anything that goes beyond that limit
    if (freeSpace < events.length) {
      const droppedEvents = events.slice(-(events.length - freeSpace));
      events.length = freeSpace;
      this.reportTelemetryCounters(droppedEvents, {
        type: TelemetryCounterType.dropped,
        code: 'queue_full',
      });
    }

    this.internalQueue.push(...events);
  }

  public shutdown() {
    // We need to emit first to trigger anything that depends on the shutdown event...
    this.shutdown$.next();
    // ... and complete for anything that validates this.shutdown$.closed
    this.shutdown$.complete();
  }

  private setInternalSubscriber() {
    // Check the status of the queues every 1 second.
    const subscription = merge(interval(1000), this.shutdown$)
      .pipe(
        // Only move ahead if it's opted-in.
        filter(() => this.isOptedIn === true),

        // Send the events now if:
        // - The last time we sent was more than 10 seconds ago and:
        //   - We reached the minimum batch size of 10kB per request in our leaky bucket.
        //   - The queue is full (meaning we'll never get to 10kB because the events are very small).
        // - There are some events in the queue, and we didn't send anything in the last 10 minutes.
        // - We are shutting down.
        filter(
          () =>
            (this.lastBatchSent$.value - Date.now() > 10 * SECONDS &&
              (this.internalQueue.length === 1000 ||
                this.getQueueByteSize(this.internalQueue) < 10 * KIB)) ||
            (this.internalQueue.length > 0 &&
              this.lastBatchSent$.value - Date.now() < 10 * MINUTES) ||
            this.shutdown$.closed
        ),

        // Send the events
        exhaustMap(async () => {
          const eventsToSend = this.getEventsToSend();
          await this.sendEvents(eventsToSend);
        })
      )
      .subscribe(() => {
        if (this.shutdown$.closed) {
          subscription.unsubscribe();
        }
      });
  }

  /**
   * Calculates the size of the queue in bytes.
   * @returns The number of bytes held in the queue.
   */
  private getQueueByteSize(queue: Event[]) {
    return queue.reduce((acc, event) => {
      return acc + Buffer.from(JSON.stringify(event)).length;
    }, 0);
  }

  /**
   * Returns a queue of events of up-to 10kB.
   * @private
   */
  private getEventsToSend(): Event[] {
    // If the internal queue is already smaller than the minimum batch size, do a direct assignment.
    if (this.getQueueByteSize(this.internalQueue) < 10 * KIB) {
      return this.internalQueue.splice(0, this.internalQueue.length);
    }
    // Otherwise, we'll feed the events to the leaky bucket queue until we reach 10kB.
    const queue: Event[] = [];
    while (this.getQueueByteSize(queue) < 10 * KIB) {
      queue.push(this.internalQueue.shift()!);
    }
    return queue;
  }

  private async sendEvents(events: Event[]) {
    try {
      const code = await this.makeRequest(events);
      this.reportTelemetryCounters(events, { code });
    } catch (error) {
      this.reportTelemetryCounters(events, { code: error.code, error });
    }
  }

  private async makeRequest(events: Event[]): Promise<string> {
    const { status, text, ok } = await fetch(
      buildUrl(this.initContext.sendTo, this.options.channelName),
      {
        method: 'POST',
        body: eventsToNDJSON(events),
        headers: {
          'content-type': 'application/x-njson',
          'x-elastic-cluster-id': this.clusterUuid,
          'x-elastic-stack-version': this.options.version,
          ...(this.licenseId && { 'x-elastic-license-id': this.licenseId }),
        },
        ...(this.options.debug && { query: { debug: true } }),
      }
    );

    if (this.options.debug) {
      this.initContext.logger.debug(
        `[${ElasticV3ServerShipper.shipperName}]: ${status} - ${await text()}`
      );
    }

    if (!ok) {
      const error: Error & { code?: string } = new Error(`${status} - ${await text()}`);
      error.code = `${status}`;
      throw error;
    }

    return `${status}`;
  }
}
