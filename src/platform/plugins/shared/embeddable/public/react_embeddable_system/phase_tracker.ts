/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PhaseEvent,
  apiPublishesDataLoading,
  apiPublishesRendered,
} from '@kbn/presentation-publishing';
import { BehaviorSubject, Subscription, combineLatest } from 'rxjs';

export class PhaseTracker {
  private firstLoadCompleteTime: number | undefined;
  private embeddableStartTime = performance.now();
  private subscriptions = new Subscription();
  private phase$ = new BehaviorSubject<PhaseEvent | undefined>(undefined);

  getPhase$() {
    return this.phase$;
  }

  public trackPhaseEvents(uuid: string, api: unknown) {
    const dataLoading$ = apiPublishesDataLoading(api)
      ? api.dataLoading
      : new BehaviorSubject(false);
    const rendered$ = apiPublishesRendered(api) ? api.rendered$ : new BehaviorSubject(true);

    this.subscriptions.add(
      combineLatest([dataLoading$, rendered$]).subscribe(([dataLoading, rendered]) => {
        if (!this.firstLoadCompleteTime) {
          this.firstLoadCompleteTime = performance.now();
        }
        const duration = this.firstLoadCompleteTime - this.embeddableStartTime;
        const status = dataLoading || !rendered ? 'loading' : 'rendered';
        this.phase$.next({ id: uuid, status, timeToEvent: duration });
      })
    );
  }

  public cleanup() {
    this.subscriptions.unsubscribe();
  }
}
