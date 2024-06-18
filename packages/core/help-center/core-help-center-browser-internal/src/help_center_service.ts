/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, takeUntil, map } from 'rxjs';
import type { HelpCenterSetup, HelpCenterStart } from '@kbn/core-help-center-browser';
import { HelpTopic } from '@elastic/help-center-common';

export class HelpCenterService {
  private helpCenterUrl$ = new BehaviorSubject<string | undefined>(undefined);
  private helpTopics$ = new BehaviorSubject<Record<string, HelpTopic>>({});
  private version$ = new BehaviorSubject<string | undefined>(undefined);
  private stop$ = new Subject<void>();

  /**
   * @public
   */
  public setup(): HelpCenterSetup {
    return {
      configure: ({ helpCenterUrl, version, helpTopics }) => {
        this.helpCenterUrl$.next(helpCenterUrl);
        this.version$.next(version);
        if (helpTopics && Object.keys(helpTopics).length > 0) {
          this.helpTopics$.next(helpTopics);
        }
      },
      addHelpTopics: (helpTopics) => {
        this.helpTopics$.next({ ...this.helpTopics$.value, ...helpTopics });
      },
      hasHelpTopics$: this.helpTopics$.pipe(
        takeUntil(this.stop$),
        map((cb) => Object.keys(cb).length > 0),
        shareReplay(1)
      ),
    };
  }

  /**
   * @public
   */
  public start(): HelpCenterStart {
    if (!this.helpTopics$) {
      throw new Error('Setup needs to be called before start');
    }
    return {
      hasHelpTopics$: this.helpTopics$.pipe(
        takeUntil(this.stop$),
        map((cb) => Object.keys(cb).length > 0),
        shareReplay(1)
      ),
      helpCenterUrl$: this.helpCenterUrl$.pipe(takeUntil(this.stop$), shareReplay(1)),
      helpTopics$: this.helpTopics$.pipe(takeUntil(this.stop$), shareReplay(1)),
      version$: this.version$.pipe(takeUntil(this.stop$), shareReplay(1)),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
