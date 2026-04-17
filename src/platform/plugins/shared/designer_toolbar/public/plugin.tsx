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
import type { DesignerToolbarItemProps } from '@kbn/designer-toolbar';

export interface DesignerToolbarStart {
  registerItem: (item: DesignerToolbarItemProps) => () => void;
}

const LazyCombinedFooter = lazy(() =>
  import('./combined_footer').then((m) => ({ default: m.CombinedFooter }))
);

export class DesignerToolbarPlugin implements Plugin<void, DesignerToolbarStart> {
  private readonly context: PluginInitializerContext;
  private registeredItems: DesignerToolbarItemProps[] = [];

  constructor(context: PluginInitializerContext) {
    this.context = context;
  }

  public setup(_core: CoreSetup): void {}

  public start(core: CoreStart): DesignerToolbarStart {
    const config = this.context.config.get<{ enabled: boolean }>();

    if (config.enabled) {
      const internalChrome = core.chrome as unknown as InternalChromeStart;
      const { http } = core;

      // Defer so the developer toolbar (and any other footer consumer) sets its
      // content first. We then grab that content, wrap it together with ours,
      // and set the combined tree as the single global footer.
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

    return {
      registerItem: (item: DesignerToolbarItemProps) => {
        this.registeredItems.push(item);
        return () => {
          this.registeredItems = this.registeredItems.filter((i) => i.id !== item.id);
        };
      },
    };
  }

  public stop(): void {}
}

export const plugin = (context: PluginInitializerContext) => new DesignerToolbarPlugin(context);
