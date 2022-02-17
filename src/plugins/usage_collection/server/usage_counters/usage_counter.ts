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

/**
 * Details about the counter to be incremented
 */
export interface IncrementCounterParams {
  /** The name of the counter **/
  counterName: string;
  /** The counter type ("count" by default) **/
  counterType?: string;
  /** Increment the counter by this number (1 if not specified) **/
  incrementBy?: number;
}

/**
 * Usage Counter allows to keep track of any events that occur.
 * By calling {@link IUsageCounter.incrementCounter} devs can notify this
 * API whenever the event happens.
 */
export interface IUsageCounter {
  /**
   * Notifies the counter about a new event happening so it can increase the count internally.
   * @param params {@link IncrementCounterParams}
   */
  incrementCounter: (params: IncrementCounterParams) => void;
}

export class UsageCounter implements IUsageCounter {
  private domainId: string;
  private counter$: Rx.Subject<CounterMetric>;

  constructor({ domainId, counter$ }: UsageCounterDeps) {
    this.domainId = domainId;
    this.counter$ = counter$;
  }

  public incrementCounter = (params: IncrementCounterParams) => {
    const { counterName, counterType = 'count', incrementBy = 1 } = params;

    this.counter$.next({
      counterName,
      domainId: this.domainId,
      counterType,
      incrementBy,
    });
  };
}
