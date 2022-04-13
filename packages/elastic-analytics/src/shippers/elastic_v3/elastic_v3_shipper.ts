/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, ReplaySubject, Subject } from 'rxjs';
import type { AnalyticsClientInitContext } from '../../analytics_client';
import type { Event, EventContext, TelemetryCounter } from '../../events';
import type { IShipper } from '../types';
import type { ElasticV3ShipperOptions } from './types';

export class ElasticV3Shipper implements IShipper {
  public static shipperName = 'elastic_v3';
  public readonly telemetryCounter$ = new Subject<TelemetryCounter>();

  /**
   * Holds the implementation of the internal client.
   * It will be the UI/server implementation depending on the environment.
   * Using an observable to allow us to asynchronously load the one we need.
   * @private
   */
  private readonly internalClient$ = new ReplaySubject<IShipper>(1);

  constructor(options: ElasticV3ShipperOptions, initContext: AnalyticsClientInitContext) {
    if (typeof window !== 'undefined') {
      import('./ui_shipper').then(({ ElasticV3UIShipper }) => {
        const internalClient = new ElasticV3UIShipper(options, initContext);
        this.internalClient$.next(internalClient);
        internalClient.telemetryCounter$.subscribe(this.telemetryCounter$);
      });
    } else {
      import('./server_shipper').then(({ ElasticV3ServerShipper }) => {
        const internalClient = new ElasticV3ServerShipper(options, initContext);
        this.internalClient$.next(internalClient);
        internalClient.telemetryCounter$.subscribe(this.telemetryCounter$);
      });
    }
  }

  public extendContext(newContext: EventContext) {
    this.getInternalClient().then((internalClient) => {
      if (internalClient.extendContext) {
        internalClient.extendContext(newContext);
      }
    });
  }

  public optIn(isOptedIn: boolean) {
    this.getInternalClient().then((internalClient) => {
      internalClient.optIn(isOptedIn);
    });
  }

  public reportEvents(events: Event[]) {
    this.getInternalClient().then((internalClient) => {
      internalClient.reportEvents(events);
    });
  }

  public shutdown() {
    this.getInternalClient().then((internalClient) => {
      internalClient.shutdown();
    });
  }

  private getInternalClient() {
    return firstValueFrom(this.internalClient$);
  }
}
