/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { of, Subject, Observable } from 'rxjs';
import { shareReplay, takeUntil } from 'rxjs/operators';
import type {
  CustomBrandingStart,
  CustomBrandingSetup,
  CustomBrandingSetupDeps,
} from '@kbn/core-custom-branding-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';

export class CustomBrandingService {
  private customBranding: CustomBranding = {};
  private hasCustomBranding$: Observable<boolean> = new Observable<boolean>();
  private customBranding$: Observable<CustomBranding> = new Observable<CustomBranding>();
  private stop$ = new Subject<void>();

  private hasCustomBranding() {
    return Object.keys(this.customBranding).length > 0;
  }

  /**
   * @public
   */
  public start(): CustomBrandingStart {
    if (!this.hasCustomBranding$ || !this.customBranding$) {
      throw new Error('Setup needs to be called before start');
    }
    return {
      customBranding$: this.customBranding$.pipe(takeUntil(this.stop$), shareReplay(1)),
      hasCustomBranding$: this.hasCustomBranding$.pipe(takeUntil(this.stop$), shareReplay(1)),
    };
  }

  /**
   * @public
   */
  public setup({ injectedMetadata }: CustomBrandingSetupDeps): CustomBrandingSetup {
    const customBranding = injectedMetadata.getCustomBranding() as CustomBranding;
    this.customBranding = customBranding;
    this.customBranding$ = of(customBranding);
    this.hasCustomBranding$ = of(this.hasCustomBranding());

    return {
      customBranding$: this.customBranding$.pipe(takeUntil(this.stop$), shareReplay(1)),
      hasCustomBranding$: this.hasCustomBranding$.pipe(takeUntil(this.stop$), shareReplay(1)),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
