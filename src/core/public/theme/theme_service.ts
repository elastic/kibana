/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { InjectedMetadataSetup } from '../injected_metadata';
import type { CoreTheme, ThemeServiceSetup, ThemeServiceStart } from './types';

export interface SetupDeps {
  injectedMetadata: InjectedMetadataSetup;
}

export class ThemeService {
  private theme$?: BehaviorSubject<CoreTheme>;
  private mq = window.matchMedia('(prefers-color-scheme: dark)');

  setup({ injectedMetadata }: SetupDeps): ThemeServiceSetup {
    const theme = injectedMetadata.getTheme();
    this.theme$ = new BehaviorSubject({
      darkMode: theme.theme === 'system' ? this.mq.matches : theme.theme === 'dark',
    });

    if (theme.theme === 'system') {
      this.mq.addEventListener('change', (e) => {
        this.theme$?.next({ darkMode: e.matches });
      });
    }

    return {
      theme$: this.theme$,
    };
  }

  public start(): ThemeServiceStart {
    if (!this.theme$) {
      throw new Error('setup must be called before start');
    }

    return {
      theme$: this.theme$,
    };
  }

  public stop() {
    this.theme$?.complete();
  }
}
