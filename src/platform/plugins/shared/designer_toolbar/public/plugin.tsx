/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, lazy } from 'react';
import { first } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal-types';

const LazyCombinedFooter = lazy(() =>
  import('./combined_footer').then((m) => ({ default: m.CombinedFooter }))
);

export class DesignerToolbarPlugin implements Plugin<void, void> {
  private readonly context: PluginInitializerContext;

  constructor(context: PluginInitializerContext) {
    this.context = context;
  }

  public setup(_core: CoreSetup): void {}

  public start(core: CoreStart): void {
    const config = this.context.config.get<{ enabled: boolean }>();

    if (config.enabled) {
      const internalChrome = core.chrome as unknown as InternalChromeStart;
      const { http } = core;

      queueMicrotask(() => {
        internalChrome
          .getGlobalFooter$()
          .pipe(first())
          .subscribe((existingFooter) => {
            internalChrome.setGlobalFooter(
              <Suspense fallback={existingFooter}>
                <LazyCombinedFooter existingFooter={existingFooter} http={http} />
              </Suspense>
            );
          });
      });
    }
  }

  public stop(): void {}
}

export const plugin = (context: PluginInitializerContext) => new DesignerToolbarPlugin(context);
