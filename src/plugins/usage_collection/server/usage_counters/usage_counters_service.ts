/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import * as rxOp from 'rxjs/operators';
import {
  SavedObjectsRepository,
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
} from 'src/core/server';
import type { Logger, LogMeta } from 'src/core/server';

import moment from 'moment';
import { CounterMetric, UsageCounter } from './usage_counter';
import {
  registerUsageCountersSavedObjectType,
  storeCounter,
  serializeCounterKey,
} from './saved_objects';

interface UsageCountersLogMeta extends LogMeta {
  kibana: { usageCounters: { results: unknown[] } };
}

export interface UsageCountersServiceDeps {
  logger: Logger;
  retryCount: number;
  bufferDurationMs: number;
}

export interface UsageCountersServiceSetup {
  createUsageCounter: (type: string) => UsageCounter;
  getUsageCounterByType: (type: string) => UsageCounter | undefined;
}

/* internal */
export interface UsageCountersServiceSetupDeps {
  savedObjects: SavedObjectsServiceSetup;
}

/* internal */
export interface UsageCountersServiceStartDeps {
  savedObjects: SavedObjectsServiceStart;
}

export class UsageCountersService {
  private readonly stop$ = new Rx.Subject<void>();
  private readonly retryCount: number;
  private readonly bufferDurationMs: number;

  private readonly counterSets = new Map<string, UsageCounter>();
  private readonly source$ = new Rx.Subject<CounterMetric>();
  private readonly counter$ = this.source$.pipe(rxOp.multicast(new Rx.Subject()), rxOp.refCount());
  private readonly flushCache$ = new Rx.Subject<void>();

  private readonly stopCaching$ = new Rx.Subject<void>();

  private readonly logger: Logger;

  constructor({ logger, retryCount, bufferDurationMs }: UsageCountersServiceDeps) {
    this.logger = logger;
    this.retryCount = retryCount;
    this.bufferDurationMs = bufferDurationMs;
  }

  public setup = (core: UsageCountersServiceSetupDeps): UsageCountersServiceSetup => {
    const cache$ = new Rx.ReplaySubject<CounterMetric>();
    const storingCache$ = new Rx.BehaviorSubject<boolean>(false);
    // flush cache data from cache -> source
    this.flushCache$
      .pipe(
        rxOp.exhaustMap(() => cache$),
        rxOp.takeUntil(this.stop$)
      )
      .subscribe((data) => {
        storingCache$.next(true);
        this.source$.next(data);
      });

    // store data into cache when not paused
    storingCache$
      .pipe(
        rxOp.distinctUntilChanged(),
        rxOp.switchMap((isStoring) => (isStoring ? Rx.EMPTY : this.source$)),
        rxOp.takeUntil(Rx.merge(this.stopCaching$, this.stop$))
      )
      .subscribe((data) => {
        cache$.next(data);
        storingCache$.next(false);
      });

    registerUsageCountersSavedObjectType(core.savedObjects);

    return {
      createUsageCounter: this.createUsageCounter,
      getUsageCounterByType: this.getUsageCounterByType,
    };
  };

  public start = ({ savedObjects }: UsageCountersServiceStartDeps): void => {
    this.stopCaching$.next();
    const internalRepository = savedObjects.createInternalRepository();
    this.counter$
      .pipe(
        /* buffer source events every ${bufferDurationMs} */
        rxOp.bufferTime(this.bufferDurationMs),
        /**
         * bufferTime will trigger every ${bufferDurationMs}
         * regardless if source emitted anything or not.
         * using filter will stop cut the pipe short
         */
        rxOp.filter((counters) => Array.isArray(counters) && counters.length > 0),
        rxOp.map((counters) => Object.values(this.mergeCounters(counters))),
        rxOp.takeUntil(this.stop$),
        rxOp.concatMap((counters) => this.storeDate$(counters, internalRepository))
      )
      .subscribe((results) => {
        this.logger.debug<UsageCountersLogMeta>('Store counters into savedObjects', {
          kibana: {
            usageCounters: { results },
          },
        });
      });

    this.flushCache$.next();
  };

  public stop = () => {
    this.stop$.next();
  };

  private storeDate$(
    counters: CounterMetric[],
    internalRepository: Pick<SavedObjectsRepository, 'incrementCounter'>
  ) {
    return Rx.forkJoin(
      counters.map((counter) =>
        Rx.defer(() => storeCounter(counter, internalRepository)).pipe(
          rxOp.retry(this.retryCount),
          rxOp.catchError((error) => {
            this.logger.warn(error);
            return Rx.of(error);
          })
        )
      )
    );
  }

  private createUsageCounter = (type: string): UsageCounter => {
    if (this.counterSets.get(type)) {
      throw new Error(`Usage counter set "${type}" already exists.`);
    }

    const counterSet = new UsageCounter({
      domainId: type,
      counter$: this.source$,
    });

    this.counterSets.set(type, counterSet);

    return counterSet;
  };

  private getUsageCounterByType = (type: string): UsageCounter | undefined => {
    return this.counterSets.get(type);
  };

  private mergeCounters = (counters: CounterMetric[]): Record<string, CounterMetric> => {
    const date = moment.now();
    return counters.reduce((acc, counter) => {
      const { counterName, domainId, counterType } = counter;
      const key = serializeCounterKey({ domainId, counterName, counterType, date });
      const existingCounter = acc[key];
      if (!existingCounter) {
        acc[key] = counter;
        return acc;
      }
      return {
        ...acc,
        [key]: {
          ...existingCounter,
          ...counter,
          incrementBy: existingCounter.incrementBy + counter.incrementBy,
        },
      };
    }, {} as Record<string, CounterMetric>);
  };
}
