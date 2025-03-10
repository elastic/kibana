/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { IProductInterceptPublicApi, ProductIntercept } from '@kbn/core-notifications-browser';

interface ProductInterceptDialogApiInitDeps {
  analytics: AnalyticsServiceStart;
}

export class ProductInterceptDialogApi implements IProductInterceptPublicApi {
  private startDeps?: ProductInterceptDialogApiInitDeps;
  private productIntercepts$ = new Rx.BehaviorSubject<ProductIntercept[]>([]);

  /** @internal */
  public init(startDeps: ProductInterceptDialogApiInitDeps) {
    this.startDeps = startDeps;
  }

  public get$() {
    return this.productIntercepts$.asObservable();
  }

  public add(productIntercept: ProductIntercept) {
    const intercept = {
      id: crypto.randomUUID(),
      ...productIntercept,
    };

    this.productIntercepts$.next([...this.productIntercepts$.getValue(), intercept]);

    return intercept.id;
  }
}
