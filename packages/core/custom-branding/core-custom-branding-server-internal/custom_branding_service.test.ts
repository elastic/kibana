/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockCoreContext } from '@kbn/core-base-server-mocks';
import type { KibanaRequest } from '@kbn/core-http-server';
import { CustomBrandingService } from './custom_branding_service';

describe('#setup', () => {
  const coreContext: ReturnType<typeof mockCoreContext.create> = mockCoreContext.create();

  it('registers plugin correctly', () => {
    const service = new CustomBrandingService(coreContext);
    const { register } = service.setup();
    const fetchFn = jest.fn();
    register('pluginName', fetchFn);
    expect(() => {
      register('anotherPlugin', fetchFn);
    }).toThrow('Another plugin already registered');
  });

  it('throws if `getBrandingFor` called before #start', async () => {
    const service = new CustomBrandingService(coreContext);
    const { register, getBrandingFor } = service.setup();
    const fetchFn = jest.fn();
    register('customBranding', fetchFn);
    const kibanaRequest: jest.Mocked<KibanaRequest> = {} as unknown as jest.Mocked<KibanaRequest>;
    try {
      await getBrandingFor(kibanaRequest);
    } catch (e) {
      expect(e.message).toMatch('Cannot be called before #start');
    }
  });

  it('throws if `fetchFn` not provided with register', async () => {
    const service = new CustomBrandingService(coreContext);
    const { register } = service.setup();
    try {
      // @ts-expect-error
      register('customBranding');
    } catch (e) {
      expect(e.message).toMatch(
        'Both plugin name and fetch function need to be provided when registering a plugin'
      );
    }
  });

  it('calls fetchFn correctly', async () => {
    const service = new CustomBrandingService(coreContext);
    const { register, getBrandingFor } = service.setup();
    service.start();
    const fetchFn = jest.fn();
    fetchFn.mockImplementation(() => Promise.resolve({ logo: 'myLogo' }));
    register('customBranding', fetchFn);
    const kibanaRequest: jest.Mocked<KibanaRequest> = {} as unknown as jest.Mocked<KibanaRequest>;
    const customBranding = await getBrandingFor(kibanaRequest);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(customBranding).toEqual({ logo: 'myLogo' });
  });
});
