/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type { CustomBrandingStart, CustomBrandingSetup } from '@kbn/core-custom-branding-server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { CoreContext } from '@kbn/core-base-server-internal';

const CUSTOM_BRANDING_PLUGIN = 'customBranding';

export class CustomBrandingService {
  private customBranding: CustomBranding = {};
  private registeredPlugin?: string;
  private customBranding$: BehaviorSubject<CustomBranding> = new BehaviorSubject<CustomBranding>(
    this.customBranding
  );
  private stop$ = new Subject<void>();

  constructor(core: CoreContext) {}

  private set(customBranding: CustomBranding) {
    if (this.registeredPlugin !== CUSTOM_BRANDING_PLUGIN) {
      throw new Error('Plugin needs to register before setting custom branding');
    }
    Object.keys(customBranding).forEach((key) => {
      this.customBranding[key as keyof CustomBranding] =
        customBranding[key as keyof CustomBranding];
    });
    this.customBranding$.next(this.customBranding);
  }

  private register(pluginName: string) {
    if (this.registeredPlugin) {
      throw new Error('Plugin already registered');
    }
    this.registeredPlugin = pluginName;
  }

  /**
   * @public
   */
  public start(): CustomBrandingStart {
    return {
      set: this.set.bind(this),
      customBranding$: this.customBranding$.pipe(takeUntil(this.stop$)),
    };
  }

  /**
   * @public
   */
  public setup(): CustomBrandingSetup {
    return {
      register: this.register.bind(this),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
