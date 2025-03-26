/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { Intercept } from '@kbn/core-notifications-browser';

import { InterceptTelemetry } from './telemetry';

interface InterceptDialogApiStartDeps {
  analytics: AnalyticsServiceStart;
}

interface InterceptDialogApiSetupDeps {
  analytics: AnalyticsServiceSetup;
}

export class InterceptDialogApi {
  private readonly telemetry = new InterceptTelemetry();
  private productIntercepts$ = new Rx.BehaviorSubject<Intercept[]>([]);
  private eventReporter?: ReturnType<InterceptTelemetry['start']>;

  setup({ analytics }: InterceptDialogApiSetupDeps) {
    this.telemetry.setup({ analytics });

    return {};
  }

  start({ analytics }: InterceptDialogApiStartDeps) {
    this.eventReporter = this.telemetry.start({ analytics });

    return {
      add: this.add.bind(this),
      ack: this.ack.bind(this),
      get$: this.get$.bind(this),
    };
  }

  private get$() {
    return this.productIntercepts$.asObservable();
  }

  private add(productIntercept: Intercept): string {
    const existingIntercepts = this.productIntercepts$.getValue();

    if (existingIntercepts.some((intercept) => intercept.id === productIntercept.id)) {
      this.eventReporter?.reportInterceptOverload({ interceptId: productIntercept.id });
    } else {
      // order is important so we can operate on a FIFO basis
      this.productIntercepts$.next([productIntercept, ...existingIntercepts]);

      this.eventReporter?.reportInterceptRegistration({ interceptId: productIntercept.id });
    }

    return productIntercept.id;
  }

  /**
   * @description expected to be called when a user is determined to have acknowledged the intercept for which the id is provided
   */
  private ack({
    interceptId,
    ackType,
  }: {
    interceptId: string;
    ackType: 'dismissed' | 'completed';
  }): void {
    this.productIntercepts$.next(
      this.productIntercepts$.getValue().filter((intercept) => intercept.id !== interceptId)
    );

    this.eventReporter?.reportInterceptInteraction({
      interactionType: ackType,
      interceptId,
    });
  }
}
