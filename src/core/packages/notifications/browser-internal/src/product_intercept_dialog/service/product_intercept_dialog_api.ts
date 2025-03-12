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
import type { ProductIntercept } from '@kbn/core-notifications-browser';

import { ProductInterceptTelemetry } from './telemetry';

interface ProductInterceptDialogApiStartDeps {
  analytics: AnalyticsServiceStart;
}

interface ProductInterceptDialogApiSetupDeps {
  analytics: AnalyticsServiceSetup;
}

export class ProductInterceptDialogApi {
  private readonly telemetry = new ProductInterceptTelemetry();
  private productIntercepts$ = new Rx.BehaviorSubject<ProductIntercept[]>([]);
  private eventReporter?: ReturnType<ProductInterceptTelemetry['start']>;

  setup({ analytics }: ProductInterceptDialogApiSetupDeps) {
    this.telemetry.setup({ analytics });

    return {};
  }

  start({ analytics }: ProductInterceptDialogApiStartDeps) {
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

  private add(
    productIntercept: Omit<ProductIntercept, 'id'> & Partial<Pick<ProductIntercept, 'id'>>
  ): string {
    const intercept = {
      ...productIntercept,
      id: productIntercept?.id ?? crypto.randomUUID(),
    };

    // order is important so we can operate on a FIFO basis
    this.productIntercepts$.next([intercept, ...this.productIntercepts$.getValue()]);

    return intercept.id;
  }

  /**
   * @description expected to be called when a user is determined to have acknowledged the intercept for which the id is provided
   */
  private ack(interceptId: string, ackType: 'dismissed' | 'completed'): void {
    this.get$()
      .pipe(Rx.map((intercepts) => intercepts.filter((intercept) => intercept.id !== interceptId)))
      .pipe(Rx.take(1))
      .subscribe({
        next: (intercepts) => {
          this.productIntercepts$.next(intercepts);
        },
        complete: () => {
          this.eventReporter?.reportInterceptInteraction({
            interactionType: ackType,
          });
        },
      });
  }
}
