/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';
import { InjectedMetadataSetup } from '../injected_metadata';
import type { CoreTheme } from './types';

interface SetupDeps {
  injectedMetadata: InjectedMetadataSetup;
}

export class ThemeService {
  private theme$?: BehaviorSubject<CoreTheme>;
  private stop$ = new Subject();

  public setup({ injectedMetadata }: SetupDeps) {
    const theme = injectedMetadata.getTheme();
    this.theme$ = new BehaviorSubject<CoreTheme>({ darkMode: theme.darkMode });
    return {
      theme$: this.theme$.pipe(takeUntil(this.stop$), shareReplay(1)),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
