/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { registryMock, managerMock } from './plugin.test.mocks';
import { SharePlugin } from './plugin';
import { CoreStart } from 'kibana/public';
import { coreMock } from '../../../core/public/mocks';
import { mockSecurityOssPlugin } from '../../security_oss/public/mocks';

describe('SharePlugin', () => {
  beforeEach(() => {
    managerMock.start.mockClear();
    registryMock.setup.mockClear();
    registryMock.start.mockClear();
  });

  describe('setup', () => {
    test('wires up and returns registry', async () => {
      const coreSetup = coreMock.createSetup();
      const plugins = {
        securityOss: mockSecurityOssPlugin.createSetup(),
      };
      const setup = await new SharePlugin().setup(coreSetup, plugins);
      expect(registryMock.setup).toHaveBeenCalledWith();
      expect(setup.register).toBeDefined();
    });

    test('registers redirect app', async () => {
      const coreSetup = coreMock.createSetup();
      const plugins = {
        securityOss: mockSecurityOssPlugin.createSetup(),
      };
      await new SharePlugin().setup(coreSetup, plugins);
      expect(coreSetup.application.register).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'short_url_redirect',
        })
      );
    });
  });

  describe('start', () => {
    test('wires up and returns show function, but not registry', async () => {
      const coreSetup = coreMock.createSetup();
      const pluginsSetup = {
        securityOss: mockSecurityOssPlugin.createSetup(),
      };
      const service = new SharePlugin();
      await service.setup(coreSetup, pluginsSetup);
      const pluginsStart = {
        securityOss: mockSecurityOssPlugin.createStart(),
      };
      const start = await service.start({} as CoreStart, pluginsStart);
      expect(registryMock.start).toHaveBeenCalled();
      expect(managerMock.start).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          getShareMenuItems: expect.any(Function),
        }),
        expect.anything()
      );
      expect(start.toggleShareContextMenu).toBeDefined();
    });
  });
});
