/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { UsageCounter } from './usage_counter';
import type { UsageCounters } from '../../common/types';
import * as Rx from 'rxjs';
import * as rxOp from 'rxjs';

describe('UsageCounter', () => {
  const domainId = 'test-domain-id';
  const counter$ = new Rx.Subject<UsageCounters.v1.CounterMetric>();
  const usageCounter = new UsageCounter({ domainId, counter$ });

  afterAll(() => {
    counter$.complete();
  });

  describe('#incrementCounter', () => {
    it('#incrementCounter calls counter$.next', async () => {
      const result = counter$.pipe(rxOp.take(1), rxOp.toArray()).toPromise();
      usageCounter.incrementCounter({ counterName: 'test', counterType: 'type', incrementBy: 13 });
      await expect(result).resolves.toEqual([
        { counterName: 'test', counterType: 'type', domainId: 'test-domain-id', incrementBy: 13 },
      ]);
    });

    it('passes default configs to counter$', async () => {
      const result = counter$.pipe(rxOp.take(1), rxOp.toArray()).toPromise();
      usageCounter.incrementCounter({ counterName: 'test' });
      await expect(result).resolves.toEqual([
        { counterName: 'test', counterType: 'count', domainId: 'test-domain-id', incrementBy: 1 },
      ]);
    });
  });
});
