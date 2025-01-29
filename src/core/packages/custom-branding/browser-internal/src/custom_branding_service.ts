/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject, BehaviorSubject } from 'rxjs';
import { shareReplay, takeUntil, map } from 'rxjs';
import type {
  CustomBrandingStart,
  CustomBrandingSetup,
  CustomBrandingSetupDeps,
} from '@kbn/core-custom-branding-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';

export class CustomBrandingService {
  private customBranding$: BehaviorSubject<CustomBranding> | undefined;
  private stop$ = new Subject<void>();

  /**
   * @public
   */
  public setup({ injectedMetadata }: CustomBrandingSetupDeps): CustomBrandingSetup {
    const customBranding = injectedMetadata.getCustomBranding();
    this.customBranding$ = new BehaviorSubject<CustomBranding>(customBranding);
    return {
      customBranding$: this.customBranding$.pipe(takeUntil(this.stop$), shareReplay(1)),
      hasCustomBranding$: this.customBranding$.pipe(
        takeUntil(this.stop$),
        map((cb) => Object.keys(cb).length > 0),
        shareReplay(1)
      ),
    };
  }

  /**
   * @public
   */
  public start(): CustomBrandingStart {
    if (!this.customBranding$) {
      throw new Error('Setup needs to be called before start');
    }
    return {
      customBranding$: this.customBranding$.pipe(takeUntil(this.stop$), shareReplay(1)),
      hasCustomBranding$: this.customBranding$.pipe(
        takeUntil(this.stop$),
        map((cb) => Object.keys(cb).length > 0),
        shareReplay(1)
      ),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
