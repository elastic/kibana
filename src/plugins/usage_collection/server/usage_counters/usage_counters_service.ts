/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import * as rxOp from 'rxjs';
import moment from 'moment';
import type {
  ISavedObjectsRepository,
  SavedObjectsFindOptions,
  SavedObjectsRepository,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { Logger, LogMeta } from '@kbn/core/server';

import { type IUsageCounter, UsageCounter } from './usage_counter';
import type { UsageCounters } from '../../common';
import {
  storeCounter,
  serializeCounterKey,
  USAGE_COUNTERS_SAVED_OBJECT_TYPE,
  type UsageCountersSavedObjectAttributes,
} from './saved_objects';
import { usageCountersSearchParamsToKueryFilter } from './usage_counters_service_utils';
import type {
  UsageCounterSnapshot,
  UsageCountersServiceSetup,
  UsageCountersServiceStart,
  UsageCountersSearchOptions,
  UsageCountersSearchParams,
  UsageCountersSearchResult,
  CreateUsageCounterParams,
} from './types';

interface UsageCountersLogMeta extends LogMeta {
  kibana: { usageCounters: { results: unknown[] } };
}

export interface UsageCountersServiceDeps {
  logger: Logger;
  retryCount: number;
  bufferDurationMs: number;
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
  private readonly counter$ = this.source$.pipe(rxOp.multicast(new Rx.Subject()), rxOp.refCount());
  private readonly flushCache$ = new Rx.Subject<void>();
  private readonly stopCaching$ = new Rx.Subject<void>();

  private repository?: ISavedObjectsRepository;

  private readonly logger: Logger;

  constructor({ logger, retryCount, bufferDurationMs }: UsageCountersServiceDeps) {
    this.logger = logger;
    this.retryCount = retryCount;
    this.bufferDurationMs = bufferDurationMs;
  }

  public setup = (): UsageCountersServiceSetup => {
    const cache$ = new Rx.ReplaySubject<UsageCounters.v1.CounterMetric>();
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
        rxOp.bufferTime(this.bufferDurationMs),
        /**
         * bufferTime will trigger every ${bufferDurationMs}
         * regardless if source emitted anything or not.
         * using filter will stop cut the pipe short
         */
        rxOp.filter((counters) => Array.isArray(counters) && counters.length > 0),
        rxOp.map((counters) => Object.values(this.mergeCounters(counters))),
        rxOp.takeUntil(this.stop$),
        rxOp.concatMap((counters) => this.storeDate$(counters, this.repository!))
      )
      .subscribe((results) => {
        this.logger.debug<UsageCountersLogMeta>('Store counters into savedObjects', {
          kibana: {
            usageCounters: { results },
          },
        });
      });

    this.flushCache$.next();

    return {
      search: this.search,
    };
  };

  public stop = () => {
    this.stop$.next();
  };

  private storeDate$(
    counters: UsageCounters.v1.CounterMetric[],
    soRepository: Pick<SavedObjectsRepository, 'incrementCounter'>
  ) {
    return Rx.forkJoin(
      counters.map((metric) =>
        Rx.defer(() => storeCounter({ metric, soRepository })).pipe(
          rxOp.retry(this.retryCount),
          rxOp.catchError((error) => {
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

  private getUsageCounterByDomainId = (type: string): IUsageCounter | undefined => {
    return this.counterSets.get(type);
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

  public search = async (
    params: UsageCountersSearchParams,
    options: UsageCountersSearchOptions = {}
  ): Promise<UsageCountersSearchResult> => {
    if (!this.repository) {
      throw new Error('Cannot search before this service is started. Please call start() first.');
    }

    const { namespace: filterNamespace } = params;
    const { perPage = 100, page = 1 } = options;

    const filter = usageCountersSearchParamsToKueryFilter(params);

    const findParams: SavedObjectsFindOptions = {
      ...(filterNamespace && { namespaces: [filterNamespace] }),
      type: USAGE_COUNTERS_SAVED_OBJECT_TYPE,
      sortField: 'updated_at',
      sortOrder: 'desc',
      filter,
      searchFields: [USAGE_COUNTERS_SAVED_OBJECT_TYPE],
      perPage,
      page,
    };
    const res = await this.repository.find<UsageCountersSavedObjectAttributes>(findParams);

    const countersMap = new Map<string, UsageCounterSnapshot>();
    res.saved_objects.forEach(({ attributes, updated_at: updatedAt, namespaces }) => {
      const namespace = namespaces?.[0];
      const key = serializeCounterKey({ ...attributes, namespace });

      let counterSnapshot = countersMap.get(key);

      if (!counterSnapshot) {
        counterSnapshot = {
          domainId: attributes.domainId,
          counterName: attributes.counterName,
          counterType: attributes.counterType,
          source: attributes.source,
          ...(namespace && namespaces?.[0] && { namespace: namespaces[0] }),
          records: [
            {
              updatedAt: updatedAt!,
              count: attributes.count,
            },
          ],
        };

        countersMap.set(key, counterSnapshot!);
      } else {
        counterSnapshot.records.push({
          updatedAt: updatedAt!,
          count: attributes.count,
        });
      }
    });

    return {
      counters: Array.from(countersMap.values()),
    };
  };
}
