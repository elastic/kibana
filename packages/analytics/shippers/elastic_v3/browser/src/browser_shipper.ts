/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  BehaviorSubject,
  interval,
  Subject,
  bufferWhen,
  concatMap,
  skipWhile,
  firstValueFrom,
  map,
  merge,
} from 'rxjs';
import type {
  AnalyticsClientInitContext,
  Event,
  EventContext,
  IShipper,
  TelemetryCounter,
} from '@kbn/analytics-client';
import { ElasticV3ShipperOptions, ErrorWithCode } from '@kbn/analytics-shippers-elastic-v3-common';
import {
  buildHeaders,
  buildUrl,
  createTelemetryCounterHelper,
  eventsToNDJSON,
} from '@kbn/analytics-shippers-elastic-v3-common';

/**
 * Elastic V3 shipper to use in the browser.
 */
export class ElasticV3BrowserShipper implements IShipper {
  /** Shipper's unique name */
  public static shipperName = 'elastic_v3_browser';

  /** Observable to emit the stats of the processed events. */
  public readonly telemetryCounter$ = new Subject<TelemetryCounter>();

  private readonly reportTelemetryCounters = createTelemetryCounterHelper(
    this.telemetryCounter$,
    ElasticV3BrowserShipper.shipperName
  );
  private readonly url: string;

  private readonly internalQueue$ = new Subject<Event>();
  private readonly flush$ = new Subject<void>();
  private readonly queueFlushed$ = new Subject<void>();

  private readonly isOptedIn$ = new BehaviorSubject<boolean | undefined>(undefined);
  private clusterUuid: string = 'UNKNOWN';
  private licenseId: string | undefined;

  /**
   * Creates a new instance of the {@link ElasticV3BrowserShipper}.
   * @param options {@link ElasticV3ShipperOptions}
   * @param initContext {@link AnalyticsClientInitContext}
   */
  constructor(
    private readonly options: ElasticV3ShipperOptions,
    private readonly initContext: AnalyticsClientInitContext
  ) {
    this.setUpInternalQueueSubscriber();
    this.url = buildUrl({
      sendTo: options.sendTo ?? initContext.sendTo,
      channelName: options.channelName,
    });
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
  }

  /**
   * Enqueues the events to be sent to in a batched approach.
   * @param events batched events {@link Event}
   */
  public reportEvents(events: Event[]) {
    events.forEach((event) => {
      this.internalQueue$.next(event);
    });
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

    const promise = firstValueFrom(this.queueFlushed$);
    this.flush$.next();
    await promise;
  }

  /**
   * Shuts down the shipper.
   * Triggers a flush of the internal queue to attempt to send any events held in the queue.
   */
  public shutdown() {
    this.internalQueue$.complete(); // NOTE: When completing the observable, the buffer logic does not wait and releases any buffered events.
    this.flush$.complete();
  }

  private setUpInternalQueueSubscriber() {
    this.internalQueue$
      .pipe(
        // Buffer events for 1 second or until we have an optIn value
        bufferWhen(() =>
          merge(
            this.flush$,
            interval(1000).pipe(skipWhile(() => this.isOptedIn$.value === undefined))
          )
        ),
        // Send events (one batch at a time)
        concatMap(async (events) => {
          // Only send if opted-in and there's anything to send
          if (this.isOptedIn$.value === true && events.length > 0) {
            await this.sendEvents(events);
          }
        }),
        map(() => this.queueFlushed$.next())
      )
      .subscribe();
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
    const response = await fetch(this.url, {
      method: 'POST',
      body: eventsToNDJSON(events),
      headers: buildHeaders(this.clusterUuid, this.options.version, this.licenseId),
      ...(this.options.debug && { query: { debug: true } }),
      // Allow the request to outlive the page in case the tab is closed
      keepalive: true,
    });

    if (this.options.debug) {
      this.initContext.logger.debug(
        `[${ElasticV3BrowserShipper.shipperName}]: ${response.status} - ${await response.text()}`
      );
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
