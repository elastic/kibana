/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CustomBrandingService } from '@kbn/core-custom-branding-browser-internal';
import { take } from 'rxjs/operators';

describe('#setup', () => {
  it('registers plugin correctly', () => {
    const service = new CustomBrandingService();
    const { register } = service.setup();
    register('pluginName');
    expect(() => {
      register('anotherPlugin');
    }).toThrow('Plugin already registered');
  });
});

describe('#start', () => {
  it('throws if plugin not registered', () => {
    const service = new CustomBrandingService();
    const { set } = service.start();
    expect(() => set({ logo: 'logo' })).toThrow(
      'Plugin needs to register before setting custom branding'
    );
  });

  describe('if plugin registered', () => {
    let service: CustomBrandingService;

    beforeEach(() => {
      service = new CustomBrandingService();
      const { register } = service.setup();
      register('customBranding');
    });

    it('hasCustomBranding$ returns correct value', async () => {
      const { set, hasCustomBranding$ } = service.start();
      let hasCustomBranding = await hasCustomBranding$.pipe(take(1)).toPromise();
      expect(hasCustomBranding).toEqual(false);
      set({ customizedLogo: 'customizedLogo' });
      hasCustomBranding = await hasCustomBranding$.pipe(take(1)).toPromise();
      expect(hasCustomBranding).toEqual(true);
    });

    it('sets custom branding correctly', async () => {
      const { set, customBranding$ } = service.start();
      set({ logo: 'logo' });
      const customBranding = await customBranding$.pipe(take(1)).toPromise();
      expect(customBranding).toEqual({ logo: 'logo' });
    });

    it('does not overwrite previously set values', async () => {
      const { set, customBranding$ } = service.start();
      set({ logo: 'logo' });
      let customBranding = await customBranding$.pipe(take(1)).toPromise();
      expect(customBranding).toEqual({ logo: 'logo' });
      set({ customizedLogo: 'customizedLogo' });
      customBranding = await customBranding$.pipe(take(1)).toPromise();
      expect(customBranding).toEqual({ logo: 'logo', customizedLogo: 'customizedLogo' });
    });

    it('overwrites previously set values if keys are the same', async () => {
      const { set, customBranding$ } = service.start();
      set({ logo: 'logo' });
      let customBranding = await customBranding$.pipe(take(1)).toPromise();
      expect(customBranding).toEqual({ logo: 'logo' });
      set({ logo: 'updatedLogo' });
      customBranding = await customBranding$.pipe(take(1)).toPromise();
      expect(customBranding).toEqual({ logo: 'updatedLogo' });
    });
  });

  describe('#stop', () => {
    it('runs fine if service never set up', () => {
      const service = new CustomBrandingService();
      expect(() => service.stop()).not.toThrowError();
    });

    it('stops customBranding$ and hasCustomBranding$', async () => {
      const service = new CustomBrandingService();
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
