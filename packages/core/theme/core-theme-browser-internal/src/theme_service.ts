/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Subject, of } from 'rxjs';
import type { InternalInjectedMetadataSetup } from '@kbn/core-injected-metadata-browser-internal';
import type { CoreTheme, ThemeServiceSetup, ThemeServiceStart } from '@kbn/core-theme-browser';

/** @internal */
export interface ThemeServiceSetupDeps {
  injectedMetadata: InternalInjectedMetadataSetup;
}

/** @internal */
export class ThemeService {
  private contract?: ThemeServiceSetup;
  private stop$ = new Subject<void>();

  public setup({ injectedMetadata }: ThemeServiceSetupDeps): ThemeServiceSetup {
    const themeMeta = injectedMetadata.getTheme();
    const theme: CoreTheme = { darkMode: themeMeta.darkMode };

    this.contract = {
      theme$: of(theme),
      getTheme: () => theme,
    };

    return this.contract;
  }

  public start(): ThemeServiceStart {
    if (!this.contract) {
      throw new Error('setup must be called before start');
    }

    return this.contract;
  }

  public stop() {
    this.stop$.next();
  }
}
