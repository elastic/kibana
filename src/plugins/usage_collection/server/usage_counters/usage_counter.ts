/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DEFAULT_NAMESPACE_STRING } from '@kbn/core-saved-objects-utils-server';
import * as Rx from 'rxjs';
import type { UsageCounters } from '../../common/types';
import type { UsageCounterSavedObjectType } from './saved_objects';

export interface UsageCounterParams {
  soType: UsageCounterSavedObjectType;
  domainId: string;
  counter$: Rx.Subject<UsageCounters.v1.CounterMetric>;
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
  incrementCounter: (params: UsageCounters.v1.IncrementCounterParams) => void;
}

export class UsageCounter implements IUsageCounter {
  private domainId: string;
  private counter$: Rx.Subject<UsageCounters.v1.CounterMetric>;
  public readonly type: UsageCounterSavedObjectType;

  constructor({ domainId, counter$, soType }: UsageCounterParams) {
    this.domainId = domainId;
    this.counter$ = counter$;
    this.type = soType;
  }

  public incrementCounter = (params: UsageCounters.v1.IncrementCounterParams) => {
    const {
      namespace = DEFAULT_NAMESPACE_STRING,
      counterName,
      counterType = 'count',
      incrementBy = 1,
    } = params;

    this.counter$.next({
      namespace,
      counterName,
      domainId: this.domainId,
      counterType,
      incrementBy,
    });
  };
}
