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
  exhaustMap,
  filter,
  skipWhile,
} from 'rxjs';
import type { IShipper } from '../../types';
import type { Event, EventContext, TelemetryCounter } from '../../../events';
import type { ElasticV3ShipperOptions } from '../types';
import type { AnalyticsClientInitContext } from '../../../analytics_client';
import { buildUrl, createTelemetryCounterHelper, eventsToNDJSON } from '../common';

export class ElasticV3UIShipper implements IShipper {
  public static shipperName = 'elastic_v3_ui';
  public readonly telemetryCounter$ = new Subject<TelemetryCounter>();

  private readonly reportTelemetryCounters = createTelemetryCounterHelper(
    this.telemetryCounter$,
    ElasticV3UIShipper.shipperName
  );

  private readonly internalQueue$ = new Subject<Event>();

  private readonly isOptedIn$ = new BehaviorSubject<boolean | undefined>(undefined);
  private clusterUuid: string = 'UNKNOWN';
  private licenseId: string | undefined;

  constructor(
    private readonly options: ElasticV3ShipperOptions,
    private readonly initContext: AnalyticsClientInitContext
  ) {
    this.setUpInternalQueueSubscriber();
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
    this.isOptedIn$.next(isOptedIn);
  }

  public reportEvents(events: Event[]) {
    events.forEach((event) => {
      this.internalQueue$.next(event);
    });
  }

  public shutdown() {
    this.internalQueue$.complete(); // NOTE: When completing the observable, the buffer logic does not wait and releases any buffered events.
  }

  private setUpInternalQueueSubscriber() {
    this.internalQueue$
      .pipe(
        // Buffer events for 1 second or until we have an optIn value
        bufferWhen(() => interval(1000).pipe(skipWhile(() => this.isOptedIn$.value === undefined))),
        // Discard any events if we are not opted in
        skipWhile(() => this.isOptedIn$.value === false),
        // Skip empty buffers
        filter((events) => events.length > 0),
        // Send events
        exhaustMap(async (events) => this.sendEvents(events))
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
        // Allow the request to outlive the page in case the tab is closed
        keepalive: true,
      }
    );

    if (this.options.debug) {
      this.initContext.logger.debug(
        `[${ElasticV3UIShipper.shipperName}]: ${status} - ${await text()}`
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
