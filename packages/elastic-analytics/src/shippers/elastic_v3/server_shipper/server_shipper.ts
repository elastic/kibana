/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
import {
  BehaviorSubject,
  filter,
  Subject,
  interval,
  exhaustMap,
  merge,
  from,
  firstValueFrom,
  timer,
  retryWhen,
  tap,
  delayWhen,
  takeWhile,
} from 'rxjs';
import type { IShipper } from '../../types';
import type { Event, EventContext, TelemetryCounter } from '../../../events';
import { TelemetryCounterType } from '../../../events';
import type { ElasticV3ShipperOptions } from '../types';
import type { AnalyticsClientInitContext } from '../../../analytics_client';
import { buildUrl, createTelemetryCounterHelper, eventsToNDJSON } from '../common';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
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

  /**
   * Specifies when it went offline:
   * - `undefined` means it doesn't know yet whether it is online or offline
   * - `null` means it's online
   * - `number` means it's offline since that time
   * @private
   */
  private firstTimeOffline?: number | null;

  constructor(
    private readonly options: ElasticV3ShipperOptions,
    private readonly initContext: AnalyticsClientInitContext
  ) {
    this.setInternalSubscriber();
    this.checkConnectivity();
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
    if (
      this.isOptedIn === false ||
      (this.firstTimeOffline && Date.now() - this.firstTimeOffline > 24 * HOUR)
    ) {
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
    this.shutdown$.complete();
  }

  /**
   * Checks the server has connectivity to the remote endpoint.
   * The frequency of the connectivity tests will back off, starting with 1 minute, and multiplying by 2
   * until it reaches 1 hour. Then, it’ll keep the 1h frequency until it reaches 24h without connectivity.
   * At that point, it clears the queue and stops accepting events in the queue.
   * The connectivity checks will continue to happen every 1 hour just in case it regains it at any point.
   * @private
   */
  private checkConnectivity() {
    let backoff = 1 * MINUTE;
    timer(0, 1 * MINUTE)
      .pipe(
        takeWhile(() => this.shutdown$.isStopped === false),
        filter(() => this.isOptedIn === true && this.firstTimeOffline !== null),
        exhaustMap(async () => {
          const { ok } = await fetch(buildUrl(this.initContext.sendTo, this.options.channelName), {
            method: 'OPTIONS',
          });

          if (!ok) {
            throw new Error('Failed to connect to Elastic');
          }

          this.firstTimeOffline = null;
          backoff = 1 * MINUTE;
        }),
        retryWhen((errors) =>
          errors.pipe(
            takeWhile(() => this.shutdown$.isStopped === false),
            tap(() => {
              if (!this.firstTimeOffline) {
                this.firstTimeOffline = Date.now();
              } else if (Date.now() - this.firstTimeOffline > 24 * HOUR) {
                this.internalQueue.length = 0;
              }
              backoff = backoff * 2;
              if (backoff > 1 * HOUR) {
                backoff = 1 * HOUR;
              }
            }),
            delayWhen(() => timer(backoff))
          )
        )
      )
      .subscribe();
  }

  private setInternalSubscriber() {
    // Check the status of the queues every 1 second.
    const subscription = merge(
      interval(1000),
      // Using a promise because complete does not emit through the pipe.
      from(firstValueFrom(this.shutdown$, { defaultValue: true }))
    )
      .pipe(
        // Only move ahead if it's opted-in and online.
        filter(() => this.isOptedIn === true && this.firstTimeOffline === null),

        // Send the events now if (validations sorted from cheapest to most CPU expensive):
        // - We are shutting down.
        // - There are some events in the queue, and we didn't send anything in the last 10 minutes.
        // - The last time we sent was more than 10 seconds ago and:
        //   - We reached the minimum batch size of 10kB per request in our leaky bucket.
        //   - The queue is full (meaning we'll never get to 10kB because the events are very small).
        filter(
          () =>
            (this.internalQueue.length > 0 &&
              (this.shutdown$.isStopped ||
                Date.now() - this.lastBatchSent$.value >= 10 * MINUTE)) ||
            (Date.now() - this.lastBatchSent$.value >= 10 * SECOND &&
              (this.internalQueue.length === 1000 ||
                this.getQueueByteSize(this.internalQueue) >= 10 * KIB))
        ),

        // Send the events
        exhaustMap(async () => {
          this.lastBatchSent$.next(Date.now());
          const eventsToSend = this.getEventsToSend();
          await this.sendEvents(eventsToSend);
        })
      )
      .subscribe(() => {
        if (this.shutdown$.isStopped) {
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
      this.firstTimeOffline = undefined;
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
