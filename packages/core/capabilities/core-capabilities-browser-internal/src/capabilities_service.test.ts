/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock, type HttpSetupMock } from '@kbn/core-http-browser-mocks';
import { CapabilitiesService } from './capabilities_service';

const mockedCapabilities = {
  catalogue: {},
  management: {},
  navLinks: {
    app1: true,
    app2: false,
    legacyApp1: true,
    legacyApp2: false,
  },
  foo: { feature: true },
  bar: { feature: true },
};

describe('#start', () => {
  let http: HttpSetupMock;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
    http.post.mockReturnValue(Promise.resolve(mockedCapabilities));
  });

  it('requests default capabilities on anonymous paths', async () => {
    http.anonymousPaths.isAnonymous.mockReturnValue(true);
    const service = new CapabilitiesService();
    const appIds = ['app1', 'app2', 'legacyApp1', 'legacyApp2'];
    const { capabilities } = await service.start({
      http,
      appIds,
    });

    expect(http.post).toHaveBeenCalledWith('/api/core/capabilities', {
      query: {
        useDefaultCapabilities: true,
      },
      body: JSON.stringify({ applications: appIds }),
    });

    // @ts-expect-error TypeScript knows this shouldn't be possible
    expect(() => (capabilities.foo = 'foo')).toThrowError();
  });

  it('only returns capabilities for given appIds', async () => {
    const service = new CapabilitiesService();
    const appIds = ['app1', 'app2', 'legacyApp1', 'legacyApp2'];
    const { capabilities } = await service.start({
      http,
      appIds,
    });

    expect(http.post).toHaveBeenCalledWith('/api/core/capabilities', {
      body: JSON.stringify({ applications: appIds }),
    });

    // @ts-expect-error TypeScript knows this shouldn't be possible
    expect(() => (capabilities.foo = 'foo')).toThrowError();
  });

  it('does not allow Capabilities to be modified', async () => {
    const service = new CapabilitiesService();
    const { capabilities } = await service.start({
      http,
      appIds: ['app1', 'app2', 'legacyApp1', 'legacyApp2'],
    });

    // @ts-expect-error TypeScript knows this shouldn't be possible
    expect(() => (capabilities.foo = 'foo')).toThrowError();
  });
});
