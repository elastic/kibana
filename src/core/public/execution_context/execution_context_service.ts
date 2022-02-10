/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { CoreSetup } from '..';
import { CoreService } from '../../types';
import type { SpacesPluginStart } from '../../../../x-pack/plugins/spaces/public';

export type ExecutionContext = Record<string, any>;

/** @public */
export interface ExecutionContextSetup {
  context$: Observable<ExecutionContext>;
  set(c$: ExecutionContext): void;
  getAll(): ExecutionContext;
  clear(): void;
}

/**
 * See {@link ExecutionContextSetup}.
 * @public
 */
export type ExecutionContextStart = ExecutionContextSetup;

export interface SetupDeps {
  core: CoreSetup<ExecutionContextStartDependencies>;
}

export interface StartDeps {
  curApp$: Observable<string | undefined>;
}

export interface ExecutionContextStartDependencies {
  spaces?: SpacesPluginStart;
}

/** @internal */
export class ExecutionContextService
  implements CoreService<ExecutionContextSetup, ExecutionContextStart>
{
  private context$: BehaviorSubject<ExecutionContext> = new BehaviorSubject({});
  private appId?: string;
  private space: string = '';
  private subscription: Subscription = new Subscription();
  private contract?: ExecutionContextSetup;

  public setup({ core }: SetupDeps) {
    // Track space changes
    core.getStartServices().then(([_, pluginDeps]) => {
      const spacesApi = pluginDeps.spaces;
      if (spacesApi) {
        this.subscription.add(
          spacesApi.getActiveSpace$().subscribe((space) => {
            this.space = space.id;
          })
        );
      }
    });
    this.contract = {
      context$: this.context$,
      clear: () => {
        this.context$.next({});
      },
      set: (c: ExecutionContext) => {
        const newVal = {
          url: window.location.pathname,
          name: this.appId,
          space: this.space,
          ...this.context$.value,
          ...c,
        };
        if (!isEqual(newVal, this.context$.value)) {
          this.context$.next(newVal);
        }
      },
      getAll: () => {
        return this.context$.value;
      },
    };

    return this.contract;
  }

  public start({ curApp$ }: StartDeps) {
    const start = this.contract!;

    // Track app id changes and clear context on app change
    this.subscription.add(
      curApp$.pipe(distinctUntilChanged()).subscribe((appId) => {
        start.clear();
        this.appId = appId;
      })
    );

    return start;
  }

  public stop() {
    this.subscription.unsubscribe();
  }
}
