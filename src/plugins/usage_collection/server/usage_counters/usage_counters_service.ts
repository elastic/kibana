/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import moment from 'moment';
import type {
  ISavedObjectsRepository,
  SavedObjectsRepository,
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { Logger, LogMeta } from '@kbn/core/server';

import { type IUsageCounter, UsageCounter } from './usage_counter';
import type { UsageCounters } from '../../common';
import type {
  UsageCountersServiceSetup,
  UsageCountersServiceStart,
  UsageCountersSearchParams,
  UsageCountersSearchResult,
  CreateUsageCounterParams,
} from './types';
import {
  storeCounter,
  serializeCounterKey,
  registerUsageCountersSavedObjectTypes,
} from './saved_objects';
import { registerUsageCountersRollups } from './rollups';
import { searchUsageCounters } from './search';

interface UsageCountersLogMeta extends LogMeta {
  kibana: { usageCounters: { results: unknown[] } };
}

export interface UsageCountersServiceDeps {
  logger: Logger;
  retryCount: number;
  bufferDurationMs: number;
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
  private readonly source$ = new Rx.Subject<UsageCounters.v1.CounterMetric>();
  private readonly counter$ = this.source$.pipe(Rx.multicast(new Rx.Subject()), Rx.refCount());
  private readonly flushCache$ = new Rx.Subject<void>();
  private readonly stopCaching$ = new Rx.Subject<void>();

  private repository?: ISavedObjectsRepository;

  private readonly logger: Logger;

  constructor({ logger, retryCount, bufferDurationMs }: UsageCountersServiceDeps) {
    this.logger = logger;
    this.retryCount = retryCount;
    this.bufferDurationMs = bufferDurationMs;
  }

  public setup = ({ savedObjects }: UsageCountersServiceSetupDeps): UsageCountersServiceSetup => {
    const cache$ = new Rx.ReplaySubject<UsageCounters.v1.CounterMetric>();
    const storingCache$ = new Rx.BehaviorSubject<boolean>(false);
    // flush cache data from cache -> source
    this.flushCache$
      .pipe(
        Rx.exhaustMap(() => cache$),
        Rx.takeUntil(this.stop$)
      )
      .subscribe((data) => {
        storingCache$.next(true);
        this.source$.next(data);
      });

    // store data into cache when not paused
    storingCache$
      .pipe(
        Rx.distinctUntilChanged(),
        Rx.switchMap((isStoring) => (isStoring ? Rx.EMPTY : this.source$)),
        Rx.takeUntil(Rx.merge(this.stopCaching$, this.stop$))
      )
      .subscribe((data) => {
        cache$.next(data);
        storingCache$.next(false);
      });

    // register the usage-counter and usage-counters (deprecated) types
    registerUsageCountersSavedObjectTypes(savedObjects);

    return {
      createUsageCounter: this.createUsageCounter,
      getUsageCounterByDomainId: this.getUsageCounterByDomainId,
    };
  };

  public start = ({ savedObjects }: UsageCountersServiceStartDeps): UsageCountersServiceStart => {
    this.stopCaching$.next();
    this.repository = savedObjects.createInternalRepository();
    this.counter$
      .pipe(
        /* buffer source events every ${bufferDurationMs} */
        Rx.bufferTime(this.bufferDurationMs),
        /**
         * bufferTime will trigger every ${bufferDurationMs}
         * regardless if source emitted anything or not.
         * using filter will stop cut the pipe short
         */
        Rx.filter((counters) => Array.isArray(counters) && counters.length > 0),
        Rx.map((counters) => Object.values(this.mergeCounters(counters))),
        Rx.takeUntil(this.stop$),
        Rx.concatMap((counters) => this.storeDate$(counters, this.repository!))
      )
      .subscribe((results) => {
        this.logger.debug<UsageCountersLogMeta>('Store counters into savedObjects', {
          kibana: {
            usageCounters: { results },
          },
        });
      });

    this.flushCache$.next();

    // we start a regular, timer-based cleanup
    registerUsageCountersRollups({
      logger: this.logger,
      getRegisteredUsageCounters: () => Array.from(this.counterSets.values()),
      internalRepository: this.repository,
      pluginStop$: this.stop$,
    });

    return {
      search: this.search,
    };
  };

  public stop = (): UsageCountersServiceStart => {
    this.stop$.next();
    this.stop$.complete();

    return {
      search: this.search,
    };
  };

  private storeDate$(
    counters: UsageCounters.v1.CounterMetric[],
    soRepository: Pick<SavedObjectsRepository, 'incrementCounter'>
  ) {
    return Rx.forkJoin(
      counters.map((metric) =>
        Rx.defer(() => storeCounter({ metric, soRepository })).pipe(
          Rx.retry(this.retryCount),
          Rx.catchError((error) => {
            this.logger.warn(error);
            return Rx.of(error);
          })
        )
      )
    );
  }

  private createUsageCounter = (
    domainId: string,
    params: CreateUsageCounterParams = {}
  ): IUsageCounter => {
    if (this.counterSets.get(domainId)) {
      throw new Error(`Usage counter set "${domainId}" already exists.`);
    }

    const counterSet = new UsageCounter({
      domainId,
      counter$: this.source$,
      retentionPeriodDays: params.retentionPeriodDays,
    });
    this.counterSets.set(domainId, counterSet);
    return counterSet;
  };

  private getUsageCounterByDomainId = (domainId: string): IUsageCounter | undefined => {
    return this.counterSets.get(domainId);
  };

  private mergeCounters = (
    counters: UsageCounters.v1.CounterMetric[]
  ): Record<string, UsageCounters.v1.CounterMetric> => {
    const date = moment.now();
    return counters.reduce((acc, counter) => {
      const { domainId, counterName, counterType, namespace, source } = counter;
      const key = serializeCounterKey({
        domainId,
        counterName,
        counterType,
        namespace,
        source,
        date,
      });
      const existingCounter = acc[key];
      if (!existingCounter) {
        acc[key] = counter;
        return acc;
      }
      acc[key] = {
        ...existingCounter,
        ...counter,
        incrementBy: existingCounter.incrementBy + counter.incrementBy,
      };
      return acc;
    }, {} as Record<string, UsageCounters.v1.CounterMetric>);
  };

  private search = async (
    params: UsageCountersSearchParams
  ): Promise<UsageCountersSearchResult> => {
    if (!this.repository) {
      throw new Error('Cannot search before this service is started. Please call start() first.');
    }

    return await searchUsageCounters(this.repository, params);
  };
}
