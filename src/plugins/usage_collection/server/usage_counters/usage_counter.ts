/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';

export interface CounterMetric {
  domainId: string;
  counterName: string;
  counterType: string;
  incrementBy: number;
}

export interface UsageCounterDeps {
  domainId: string;
  counter$: Rx.Subject<CounterMetric>;
}

export interface IncrementCounterConfig {
  counterName: string;
  counterType?: string;
  incrementBy?: number;
}

export class UsageCounter {
  private domainId: string;
  private counter$: Rx.Subject<CounterMetric>;

  constructor({ domainId, counter$ }: UsageCounterDeps) {
    this.domainId = domainId;
    this.counter$ = counter$;
  }

  public incrementCounter = (config: IncrementCounterConfig) => {
    const { counterName, counterType = 'count', incrementBy = 1 } = config;

    this.counter$.next({
      counterName,
      domainId: this.domainId,
      counterType,
      incrementBy,
    });
  };
}
