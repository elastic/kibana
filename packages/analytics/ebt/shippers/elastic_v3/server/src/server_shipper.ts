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
  merge,
  timer,
  retryWhen,
  tap,
  delayWhen,
  takeUntil,
  map,
  BehaviorSubject,
  exhaustMap,
  mergeMap,
  skip,
  firstValueFrom,
} from 'rxjs';
import {
  type ElasticV3ShipperOptions,
  buildHeaders,
  buildUrl,
  createTelemetryCounterHelper,
  eventsToNDJSON,
  ErrorWithCode,
} from '../../common';
import type {
  AnalyticsClientInitContext,
  Event,
  EventContext,
  IShipper,
  TelemetryCounter,
} from '../../../../client';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const KIB = 1024;
const MAX_NUMBER_OF_EVENTS_IN_INTERNAL_QUEUE = 1000;
const MIN_TIME_SINCE_LAST_SEND = 10 * SECOND;

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
  private readonly flush$ = new Subject<void>();
  private readonly inFlightRequests$ = new BehaviorSubject<number>(0);
  private readonly isOptedIn$ = new BehaviorSubject<boolean | undefined>(undefined);

  private readonly url: string;

  private lastBatchSent = Date.now();

  private clusterUuid: string = 'UNKNOWN';
  private licenseId?: string;

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
    this.isOptedIn$.next(isOptedIn);

    if (isOptedIn === false) {
      this.internalQueue.length = 0;
    }
  }

  /**
   * Enqueues the events to be sent via the leaky bucket algorithm.
   * @param events batched events {@link Event}
   */
  public reportEvents(events: Event[]) {
    // If opted out OR offline for longer than 24 hours, skip processing any events.
    if (
      this.isOptedIn$.value === false ||
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
        type: 'dropped',
        code: 'queue_full',
      });
    }

    this.internalQueue.push(...events);
  }

  /**
   * Triggers a flush of the internal queue to attempt to send any events held in the queue
   * and resolves the returned promise once the queue is emptied.
   */
  public async flush() {
    if (this.flush$.isStopped) {
      // If called after shutdown, return straight away
      return;
    }

    const promise = firstValueFrom(
      this.inFlightRequests$.pipe(
        skip(1), // Skipping the first value because BehaviourSubjects always emit the current value on subscribe.
        filter((count) => count === 0) // Wait until all the inflight requests are completed.
      )
    );
    this.flush$.next();
    await promise;
  }

  /**
   * Shuts down the shipper.
   * Triggers a flush of the internal queue to attempt to send any events held in the queue.
   */
  public shutdown() {
    this.shutdown$.next();
    this.flush$.complete();
    this.shutdown$.complete();
    this.isOptedIn$.complete();
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
    merge(
      timer(0, 1 * MINUTE),
      // Also react to opt-in changes to avoid being stalled for 1 minute for the first connectivity check.
      // More details in: https://github.com/elastic/kibana/issues/135647
      this.isOptedIn$
    )
      .pipe(
        takeUntil(this.shutdown$),
        filter(() => this.isOptedIn$.value === true && this.firstTimeOffline !== null),
        // Using exhaustMap here because one request at a time is enough to check the connectivity.
        exhaustMap(async () => {
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
    // Create an emitter that emits when MIN_TIME_SINCE_LAST_SEND have passed since the last time we sent the data
    const minimumTimeSinceLastSent$ = interval(SECOND).pipe(
      filter(() => Date.now() - this.lastBatchSent >= MIN_TIME_SINCE_LAST_SEND)
    );

    merge(
      minimumTimeSinceLastSent$.pipe(
        takeUntil(this.shutdown$),
        map(() => ({ shouldFlush: false }))
      ),
      // Whenever a `flush` request comes in
      this.flush$.pipe(map(() => ({ shouldFlush: true }))),
      // Attempt to send one last time on shutdown, flushing the queue
      this.shutdown$.pipe(map(() => ({ shouldFlush: true })))
    )
      .pipe(
        // Only move ahead if it's opted-in and online, and there are some events in the queue
        filter(() => {
          const shouldSendAnything =
            this.isOptedIn$.value === true &&
            this.firstTimeOffline === null &&
            this.internalQueue.length > 0;

          // If it should not send anything, re-emit the inflight request observable just in case it's already 0
          if (!shouldSendAnything) {
            this.inFlightRequests$.next(this.inFlightRequests$.value);
          }

          return shouldSendAnything;
        }),

        // Send the events:
        // 1. Set lastBatchSent and retrieve the events to send (clearing the queue) in a synchronous operation to avoid race conditions.
        map(({ shouldFlush }) => {
          this.lastBatchSent = Date.now();
          return this.getEventsToSend(shouldFlush);
        }),
        // 2. Skip empty buffers (just to be sure)
        filter((events) => events.length > 0),
        // 3. Actually send the events
        // Using `mergeMap` here because we want to send events whenever the emitter says so:
        //   We don't want to skip emissions (exhaustMap) or enqueue them (concatMap).
        mergeMap((eventsToSend) => this.sendEvents(eventsToSend))
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
   * Returns a queue of events of up-to 10kB. Or all events in the queue if it's a FLUSH action.
   * @remarks It mutates the internal queue by removing from it the events returned by this method.
   * @private
   */
  private getEventsToSend(shouldFlush: boolean): Event[] {
    // If the internal queue is already smaller than the minimum batch size, or it's a flush action, do a direct assignment.
    if (shouldFlush || this.getQueueByteSize(this.internalQueue) < 10 * KIB) {
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
    this.inFlightRequests$.next(this.inFlightRequests$.value + 1);
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
    this.inFlightRequests$.next(Math.max(0, this.inFlightRequests$.value - 1));
  }

  private async makeRequest(events: Event[]): Promise<string> {
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
