/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { packageRegistryDocker } from '@kbn/test';

describe('Scout base configs', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('stateful base config', () => {
    it('includes --xpack.fleet.registryUrl when FLEET_PACKAGE_REGISTRY_PORT is set', async () => {
      process.env.FLEET_PACKAGE_REGISTRY_PORT = '6104';

      const { defaultConfig } = await import('./stateful/base.config');
      const serverArgs: string[] = defaultConfig.kbnTestServer.serverArgs;

      expect(serverArgs).toContain('--xpack.fleet.registryUrl=http://localhost:6104');
    });

    it('omits --xpack.fleet.registryUrl when FLEET_PACKAGE_REGISTRY_PORT is not set', async () => {
      delete process.env.FLEET_PACKAGE_REGISTRY_PORT;

      const { defaultConfig } = await import('./stateful/base.config');
      const serverArgs: string[] = defaultConfig.kbnTestServer.serverArgs;
      const registryArgs = serverArgs.filter((arg) => arg.includes('fleet.registryUrl'));

      expect(registryArgs).toHaveLength(0);
    });

    it('uses packageRegistryDocker from @kbn/test for dockerServers', async () => {
      process.env.FLEET_PACKAGE_REGISTRY_PORT = '6104';

      const { defaultConfig } = await import('./stateful/base.config');
      const registryConfig = (defaultConfig.dockerServers as Record<string, any>).registry;

      expect(registryConfig.image).toBe(packageRegistryDocker.image);
      expect(registryConfig.portInContainer).toBe(packageRegistryDocker.portInContainer);
      expect(registryConfig.waitForLogLine).toBe(packageRegistryDocker.waitForLogLine);
      expect(registryConfig.preferCached).toBe(packageRegistryDocker.preferCached);
    });

    it('overrides waitForLogLineTimeoutMs to 6 minutes', async () => {
      process.env.FLEET_PACKAGE_REGISTRY_PORT = '6104';

      const { defaultConfig } = await import('./stateful/base.config');
      const registryConfig = (defaultConfig.dockerServers as Record<string, any>).registry;

      expect(registryConfig.waitForLogLineTimeoutMs).toBe(60 * 6 * 1000);
    });
  });

  describe('serverless base config', () => {
    it('includes --xpack.fleet.registryUrl when FLEET_PACKAGE_REGISTRY_PORT is set', async () => {
      process.env.FLEET_PACKAGE_REGISTRY_PORT = '6104';

      const { defaultConfig } = await import('./serverless/serverless.base.config');
      const serverArgs: string[] = defaultConfig.kbnTestServer.serverArgs;

      expect(serverArgs).toContain('--xpack.fleet.registryUrl=http://localhost:6104');
    });

    it('omits --xpack.fleet.registryUrl when FLEET_PACKAGE_REGISTRY_PORT is not set', async () => {
      delete process.env.FLEET_PACKAGE_REGISTRY_PORT;

      const { defaultConfig } = await import('./serverless/serverless.base.config');
      const serverArgs: string[] = defaultConfig.kbnTestServer.serverArgs;
      const registryArgs = serverArgs.filter((arg) => arg.includes('fleet.registryUrl'));

      expect(registryArgs).toHaveLength(0);
    });

    it('uses packageRegistryDocker from @kbn/test for dockerServers', async () => {
      process.env.FLEET_PACKAGE_REGISTRY_PORT = '6104';

      const { defaultConfig } = await import('./serverless/serverless.base.config');
      const registryConfig = (defaultConfig.dockerServers as Record<string, any>).registry;

      expect(registryConfig.image).toBe(packageRegistryDocker.image);
      expect(registryConfig.portInContainer).toBe(packageRegistryDocker.portInContainer);
      expect(registryConfig.waitForLogLine).toBe(packageRegistryDocker.waitForLogLine);
      expect(registryConfig.preferCached).toBe(packageRegistryDocker.preferCached);
    });

    it('overrides waitForLogLineTimeoutMs to 6 minutes', async () => {
      process.env.FLEET_PACKAGE_REGISTRY_PORT = '6104';

      const { defaultConfig } = await import('./serverless/serverless.base.config');
      const registryConfig = (defaultConfig.dockerServers as Record<string, any>).registry;

      expect(registryConfig.waitForLogLineTimeoutMs).toBe(60 * 6 * 1000);
    });
  });
});
