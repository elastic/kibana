/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createCustomizationService, DiscoverCustomization } from './customization_service';

describe('createCustomizatonService', () => {
  it('should return a service', () => {
    const service = createCustomizationService();
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should add a customization', async () => {
      const service = createCustomizationService();
      const customization: DiscoverCustomization = { id: 'top_nav' };
      let current: DiscoverCustomization | undefined;
      service.get$('top_nav').subscribe((value) => {
        current = value;
      });
      expect(current).toBe(undefined);
      service.set(customization);
      expect(current).toBe(customization);
    });

    it('should update a customization', async () => {
      const service = createCustomizationService();
      const customization: DiscoverCustomization = {
        id: 'top_nav',
        defaultMenu: { newItem: { disabled: true } },
      };
      service.set(customization);
      let current: DiscoverCustomization | undefined;
      service.get$('top_nav').subscribe((value) => {
        current = value;
      });
      expect(current).toBe(customization);
      const updatedCustomization: DiscoverCustomization = {
        ...customization,
        defaultMenu: { newItem: { disabled: false } },
      };
      service.set(updatedCustomization);
      expect(current).toBe(updatedCustomization);
    });

    it('should remain disabled when updating a customization', async () => {
      const service = createCustomizationService();
      const customization: DiscoverCustomization = {
        id: 'top_nav',
        defaultMenu: { newItem: { disabled: true } },
      };
      service.set(customization);
      let current: DiscoverCustomization | undefined;
      service.get$('top_nav').subscribe((value) => {
        current = value;
      });
      expect(current).toBe(customization);
      service.disable('top_nav');
      expect(current).toBeUndefined();
      const updatedCustomization: DiscoverCustomization = {
        ...customization,
        defaultMenu: { newItem: { disabled: false } },
      };
      service.set(updatedCustomization);
      expect(current).toBeUndefined();
    });
  });

  describe('get', () => {
    it('should return a customization', async () => {
      const service = createCustomizationService();
      const customization: DiscoverCustomization = { id: 'top_nav' };
      service.set(customization);
      const current = service.get('top_nav');
      expect(current).toBe(customization);
    });

    it('should return undefined if customization is disabled', async () => {
      const service = createCustomizationService();
      const customization: DiscoverCustomization = { id: 'top_nav' };
      service.set(customization);
      service.disable('top_nav');
      const current = service.get('top_nav');
      expect(current).toBeUndefined();
    });

    it('should return undefined if customization does not exist', async () => {
      const service = createCustomizationService();
      const current = service.get('top_nav');
      expect(current).toBeUndefined();
    });
  });

  describe('get$', () => {
    it('should return a customization', async () => {
      const service = createCustomizationService();
      const customization: DiscoverCustomization = { id: 'top_nav' };
      service.set(customization);
      let current: DiscoverCustomization | undefined;
      service.get$('top_nav').subscribe((value) => {
        current = value;
      });
      expect(current).toBe(customization);
    });

    it('should return undefined if customization is disabled', async () => {
      const service = createCustomizationService();
      const customization: DiscoverCustomization = { id: 'top_nav' };
      service.set(customization);
      let current: DiscoverCustomization | undefined;
      service.get$('top_nav').subscribe((value) => {
        current = value;
      });
      expect(current).toBe(customization);
      service.disable('top_nav');
      expect(current).toBeUndefined();
    });

    it('should return undefined if customization does not exist', async () => {
      const service = createCustomizationService();
      let current: DiscoverCustomization | undefined;
      service.get$('top_nav').subscribe((value) => {
        current = value;
      });
      expect(current).toBeUndefined();
    });
  });

  describe('disable', () => {
    it('should disable a customization', async () => {
      const service = createCustomizationService();
      const customization: DiscoverCustomization = { id: 'top_nav' };
      service.set(customization);
      let current: DiscoverCustomization | undefined;
      service.get$('top_nav').subscribe((value) => {
        current = value;
      });
      expect(current).toBe(customization);
      service.disable('top_nav');
      expect(current).toBeUndefined();
    });

    it('should not throw if customization does not exist', async () => {
      const service = createCustomizationService();
      service.disable('top_nav');
    });
  });

  describe('enable', () => {
    it('should enable a customization', async () => {
      const service = createCustomizationService();
      const customization: DiscoverCustomization = { id: 'top_nav' };
      service.set(customization);
      let current: DiscoverCustomization | undefined;
      service.get$('top_nav').subscribe((value) => {
        current = value;
      });
      expect(current).toBe(customization);
      service.disable('top_nav');
      expect(current).toBeUndefined();
      service.enable('top_nav');
      expect(current).toBe(customization);
    });

    it('should not throw if customization does not exist', async () => {
      const service = createCustomizationService();
      service.enable('top_nav');
    });
  });
});
