/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
import {
  filter,
  Subject,
  ReplaySubject,
  interval,
  concatMap,
  merge,
  from,
  firstValueFrom,
  timer,
  retryWhen,
  tap,
  delayWhen,
  takeUntil,
} from 'rxjs';
import type {
  AnalyticsClientInitContext,
  Event,
  EventContext,
  IShipper,
  TelemetryCounter,
} from '@kbn/analytics-client';
import { TelemetryCounterType } from '@kbn/analytics-client';
import type { ElasticV3ShipperOptions } from '@kbn/analytics-shippers-elastic-v3-common';
import {
  buildHeaders,
  buildUrl,
  createTelemetryCounterHelper,
  eventsToNDJSON,
  ErrorWithCode,
} from '@kbn/analytics-shippers-elastic-v3-common';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const KIB = 1024;
const MAX_NUMBER_OF_EVENTS_IN_INTERNAL_QUEUE = 1000;

/**
 * Elastic V3 shipper to use on the server side.
 */
export class ElasticV3ServerShipper implements IShipper {
  /** Shipper's unique name */
  public static shipperName = 'elastic_v3_server';

  /** Observable to emit the stats of the processed events. */
  public readonly telemetryCounter$ = new Subject<TelemetryCounter>();

  private readonly reportTelemetryCounters = createTelemetryCounterHelper(
    this.telemetryCounter$,
    ElasticV3ServerShipper.shipperName
  );

  private readonly internalQueue: Event[] = [];
  private readonly shutdown$ = new ReplaySubject<void>(1);

  private readonly url: string;

  private lastBatchSent = Date.now();

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

  /**
   * Creates a new instance of the {@link ElasticV3ServerShipper}.
   * @param options {@link ElasticV3ShipperOptions}
   * @param initContext {@link AnalyticsClientInitContext}
   */
  constructor(
    private readonly options: ElasticV3ShipperOptions,
    private readonly initContext: AnalyticsClientInitContext
  ) {
    this.url = buildUrl({
      sendTo: options.sendTo ?? initContext.sendTo,
      channelName: options.channelName,
    });
    this.setInternalSubscriber();
    this.checkConnectivity();
  }

  /**
   * Uses the `cluster_uuid` and `license_id` from the context to hold them in memory for the generation of the headers
   * used later on in the HTTP request.
   * @param newContext The full new context to set {@link EventContext}
   */
  public extendContext(newContext: EventContext) {
    if (newContext.cluster_uuid) {
      this.clusterUuid = newContext.cluster_uuid;
    }
    if (newContext.license_id) {
      this.licenseId = newContext.license_id;
    }
  }

  /**
   * When `false`, it flushes the internal queue and stops sending events.
   * @param isOptedIn `true` for resume sending events. `false` to stop.
   */
  public optIn(isOptedIn: boolean) {
    this.isOptedIn = isOptedIn;

    if (isOptedIn === false) {
      this.internalQueue.length = 0;
    }
  }

  /**
   * Enqueues the events to be sent via the leaky bucket algorithm.
   * @param events batched events {@link Event}
   */
  public reportEvents(events: Event[]) {
    if (
      this.isOptedIn === false ||
      (this.firstTimeOffline && Date.now() - this.firstTimeOffline > 24 * HOUR)
    ) {
      return;
    }

    const freeSpace = MAX_NUMBER_OF_EVENTS_IN_INTERNAL_QUEUE - this.internalQueue.length;

    // As per design, we only want store up-to 1000 events at a time. Drop anything that goes beyond that limit
    if (freeSpace < events.length) {
      const toDrop = events.length - freeSpace;
      const droppedEvents = events.splice(-toDrop, toDrop);
      this.reportTelemetryCounters(droppedEvents, {
        type: TelemetryCounterType.dropped,
        code: 'queue_full',
      });
    }

    this.internalQueue.push(...events);
  }

  /**
   * Shuts down the shipper.
   * Triggers a flush of the internal queue to attempt to send any events held in the queue.
   */
  public shutdown() {
    this.shutdown$.next();
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
        takeUntil(this.shutdown$),
        filter(() => this.isOptedIn === true && this.firstTimeOffline !== null),
        concatMap(async () => {
          const { ok } = await fetch(this.url, {
            method: 'OPTIONS',
          });

          if (!ok) {
            throw new Error(`Failed to connect to ${this.url}`);
          }

          this.firstTimeOffline = null;
          backoff = 1 * MINUTE;
        }),
        retryWhen((errors) =>
          errors.pipe(
            takeUntil(this.shutdown$),
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
    merge(
      interval(1000).pipe(takeUntil(this.shutdown$)),
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
              (this.shutdown$.isStopped || Date.now() - this.lastBatchSent >= 10 * MINUTE)) ||
            (Date.now() - this.lastBatchSent >= 10 * SECOND &&
              (this.internalQueue.length === 1000 ||
                this.getQueueByteSize(this.internalQueue) >= 10 * KIB))
        ),

        // Send the events
        concatMap(async () => {
          this.lastBatchSent = Date.now();
          const eventsToSend = this.getEventsToSend();
          await this.sendEvents(eventsToSend);
        })
      )
      .subscribe();
  }

  /**
   * Calculates the size of the queue in bytes.
   * @returns The number of bytes held in the queue.
   * @private
   */
  private getQueueByteSize(queue: Event[]) {
    return queue.reduce((acc, event) => {
      return acc + this.getEventSize(event);
    }, 0);
  }

  /**
   * Calculates the size of the event in bytes.
   * @param event The event to calculate the size of.
   * @returns The number of bytes held in the event.
   * @private
   */
  private getEventSize(event: Event) {
    return Buffer.from(JSON.stringify(event)).length;
  }

  /**
   * Returns a queue of events of up-to 10kB.
   * @remarks It mutates the internal queue by removing from it the events returned by this method.
   * @private
   */
  private getEventsToSend(): Event[] {
    // If the internal queue is already smaller than the minimum batch size, do a direct assignment.
    if (this.getQueueByteSize(this.internalQueue) < 10 * KIB) {
      return this.internalQueue.splice(0, this.internalQueue.length);
    }
    // Otherwise, we'll feed the events to the leaky bucket queue until we reach 10kB.
    const queue: Event[] = [];
    let queueByteSize = 0;
    while (queueByteSize < 10 * KIB) {
      const event = this.internalQueue.shift()!;
      queueByteSize += this.getEventSize(event);
      queue.push(event);
    }
    return queue;
  }

  private async sendEvents(events: Event[]) {
    this.initContext.logger.debug(`Reporting ${events.length} events...`);
    try {
      const code = await this.makeRequest(events);
      this.reportTelemetryCounters(events, { code });
      this.initContext.logger.debug(`Reported ${events.length} events...`);
    } catch (error) {
      this.initContext.logger.debug(`Failed to report ${events.length} events...`);
      this.initContext.logger.debug(error);
      this.reportTelemetryCounters(events, { code: error.code, error });
      this.firstTimeOffline = undefined;
    }
  }

  private async makeRequest(events: Event[]): Promise<string> {
    if (events.length === 0) {
      return '0'; // Nothing to send.
    }

    const response = await fetch(this.url, {
      method: 'POST',
      body: eventsToNDJSON(events),
      headers: buildHeaders(this.clusterUuid, this.options.version, this.licenseId),
      ...(this.options.debug && { query: { debug: true } }),
    });

    if (this.options.debug) {
      this.initContext.logger.debug(`${response.status} - ${await response.text()}`);
    }

    if (!response.ok) {
      throw new ErrorWithCode(
        `${response.status} - ${await response.text()}`,
        `${response.status}`
      );
    }

    return `${response.status}`;
  }
}
