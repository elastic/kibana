/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { UsageCounter } from './usage_counter';
import type { UsageCounters } from '../../common';

describe('UsageCounter', () => {
  const domainId = 'test-domain-id';
  const counter$ = new Rx.Subject<UsageCounters.v1.CounterMetric>();
  const usageCounter = new UsageCounter({ domainId, counter$ });

  afterAll(() => {
    counter$.complete();
  });

  describe('#incrementCounter', () => {
    it('#incrementCounter calls counter$.next', async () => {
      const result = Rx.firstValueFrom(counter$.pipe(Rx.take(1), Rx.toArray()));
      usageCounter.incrementCounter({
        counterName: 'test',
        counterType: 'type',
        incrementBy: 13,
        source: 'ui',
        namespace: 'second',
      });
      await expect(result).resolves.toEqual([
        {
          domainId: 'test-domain-id',
          counterType: 'type',
          counterName: 'test',
          source: 'ui',
          namespace: 'second',
          incrementBy: 13,
        },
      ]);
    });

    it('passes default configs to counter$', async () => {
      const result = Rx.firstValueFrom(counter$.pipe(Rx.take(1), Rx.toArray()));
      usageCounter.incrementCounter({ counterName: 'test' });
      await expect(result).resolves.toEqual([
        {
          domainId: 'test-domain-id',
          counterType: 'count',
          counterName: 'test',
          source: 'server',
          incrementBy: 1,
        },
      ]);
    });
  });
});
