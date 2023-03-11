/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { compact, isEqual, isUndefined, omitBy } from 'lodash';
import type { Observable } from 'rxjs';
import { BehaviorSubject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import type { CoreService } from '@kbn/core-base-browser-internal';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type {
  ExecutionContextSetup,
  ExecutionContextStart,
} from '@kbn/core-execution-context-browser';

// Should be exported from elastic/apm-rum
export type LabelValue = string | number | boolean;

export interface Labels {
  [key: string]: LabelValue;
}

export interface SetupDeps {
  analytics: AnalyticsServiceSetup;
}

export interface StartDeps {
  curApp$: Observable<string | undefined>;
}

/** @internal */
export class ExecutionContextService
  implements CoreService<ExecutionContextSetup, ExecutionContextStart>
{
  private context$: BehaviorSubject<KibanaExecutionContext> = new BehaviorSubject({});
  private appId?: string;
  private subscription: Subscription = new Subscription();
  private contract?: ExecutionContextSetup;

  public setup({ analytics }: SetupDeps) {
    this.enrichAnalyticsContext(analytics);

    this.contract = {
      context$: this.context$.asObservable(),
      clear: () => {
        this.context$.next(this.getDefaultContext());
      },
      set: (c: KibanaExecutionContext) => {
        const newVal = this.mergeContext(c);
        if (!isEqual(newVal, this.context$.value)) {
          this.context$.next(newVal);
        }
      },
      get: () => {
        return this.mergeContext();
      },
      getAsLabels: () => {
        return this.removeUndefined({
          name: this.appId,
          id: this.context$.value?.id,
          page: this.context$.value?.page,
        }) as Labels;
      },
      withGlobalContext: (context: KibanaExecutionContext) => {
        return this.mergeContext(context);
      },
    };

    return this.contract;
  }

  public start({ curApp$ }: StartDeps) {
    const start = this.contract!;

    // Track app id changes and clear context on app change
    this.subscription.add(
      curApp$.subscribe((appId) => {
        this.appId = appId;
        start.clear();
      })
    );

    return start;
  }

  public stop() {
    this.subscription.unsubscribe();
  }

  private removeUndefined(context: KibanaExecutionContext = {}) {
    return omitBy(context, isUndefined);
  }

  private getDefaultContext() {
    return {
      type: 'application',
      name: this.appId,
      url: window.location.pathname,
    };
  }

  private mergeContext(context: KibanaExecutionContext = {}): KibanaExecutionContext {
    return {
      ...this.getDefaultContext(),
      ...this.context$.value,
      ...context,
    };
  }

  /**
   * Sets the analytics context provider based on the execution context details.
   * @param analytics The analytics service
   * @private
   */
  private enrichAnalyticsContext(analytics: AnalyticsServiceSetup) {
    analytics.registerContextProvider({
      name: 'execution_context',
      context$: this.context$.pipe(
        map(({ type, name, page, id }) => ({
          pageName: `${compact([type, name, page]).join(':')}`,
          applicationId: name ?? type ?? 'unknown',
          page,
          entityId: id,
        }))
      ),
      schema: {
        pageName: {
          type: 'keyword',
          _meta: { description: 'The name of the current page' },
        },
        page: {
          type: 'keyword',
          _meta: { description: 'The current page', optional: true },
        },
        applicationId: {
          type: 'keyword',
          _meta: { description: 'The id of the current application' },
        },
        entityId: {
          type: 'keyword',
          _meta: {
            description:
              'The id of the current entity (dashboard, visualization, canvas, lens, etc)',
            optional: true,
          },
        },
      },
    });
  }
}
