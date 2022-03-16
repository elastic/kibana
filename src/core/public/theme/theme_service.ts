/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject, Observable, of } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';
import { InjectedMetadataSetup } from '../injected_metadata';
import type { CoreTheme, ThemeServiceSetup, ThemeServiceStart } from './types';

export interface SetupDeps {
  injectedMetadata: InjectedMetadataSetup;
}

export class ThemeService {
  private theme$?: Observable<CoreTheme>;
  private stop$ = new Subject();

  public setup({ injectedMetadata }: SetupDeps): ThemeServiceSetup {
    const theme = injectedMetadata.getTheme();
    this.theme$ = of({ darkMode: theme.darkMode });

    return {
      theme$: this.theme$.pipe(takeUntil(this.stop$), shareReplay(1)),
    };
  }

  public start(): ThemeServiceStart {
    if (!this.theme$) {
      throw new Error('setup must be called before start');
    }

    return {
      theme$: this.theme$.pipe(takeUntil(this.stop$), shareReplay(1)),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
