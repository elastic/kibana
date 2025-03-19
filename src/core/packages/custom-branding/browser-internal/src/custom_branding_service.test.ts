/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { take } from 'rxjs';
import { CustomBrandingSetupDeps } from '@kbn/core-custom-branding-browser';
import { CustomBrandingService } from './custom_branding_service';

describe('custom branding service', () => {
  const injectedMetadata = {
    getCustomBranding: () => {
      return { customizedLogo: 'customizedLogo' };
    },
  };

  describe('#start', () => {
    let service: CustomBrandingService;

    beforeEach(() => {
      service = new CustomBrandingService();
      service.setup({ injectedMetadata } as CustomBrandingSetupDeps);
    });

    it('hasCustomBranding$ returns the correct value', async () => {
      const { hasCustomBranding$ } = service.start();
      const hasCustomBranding = await hasCustomBranding$.pipe(take(1)).toPromise();
      expect(hasCustomBranding).toEqual(true);
    });

    it('customBranding$ returns the correct value', async () => {
      const { customBranding$ } = service.start();
      const customBranding = await customBranding$.pipe(take(1)).toPromise();
      expect(customBranding).toEqual({ customizedLogo: 'customizedLogo' });
    });

    it('throws if called before setup', async () => {
      const customBrandingService = new CustomBrandingService();
      expect(() => customBrandingService.start()).toThrow('Setup needs to be called before start');
    });
  });

  describe('#setup', () => {
    it('customBranding$ returns the correct value', async () => {
      const service = new CustomBrandingService();
      const { customBranding$, hasCustomBranding$ } = service.setup({
        injectedMetadata,
      } as CustomBrandingSetupDeps);
      const customBranding = await customBranding$.pipe(take(1)).toPromise();
      expect(customBranding).toEqual({ customizedLogo: 'customizedLogo' });
      const hasCustomBranding = await hasCustomBranding$.pipe(take(1)).toPromise();
      expect(hasCustomBranding).toBe(true);
    });
  });

  describe('#stop', () => {
    it('runs fine if service never set up', () => {
      const service = new CustomBrandingService();
      expect(() => service.stop()).not.toThrowError();
    });

    it('stops customBranding$ and hasCustomBranding$', async () => {
      const service = new CustomBrandingService();
      service.setup({ injectedMetadata } as CustomBrandingSetupDeps);
      const { hasCustomBranding$, customBranding$ } = service.start();

      let hasCustomBrandingCompleted = false;
      let customBrandingCompleted = false;

      hasCustomBranding$.subscribe({
        complete: () => {
          hasCustomBrandingCompleted = true;
        },
      });

      customBranding$.subscribe({
        complete: () => {
          customBrandingCompleted = true;
        },
      });

      service.stop();

      expect(customBrandingCompleted).toEqual(true);
      expect(hasCustomBrandingCompleted).toEqual(true);
    });
  });
});
