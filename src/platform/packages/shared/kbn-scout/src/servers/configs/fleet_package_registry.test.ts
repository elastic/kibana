/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { getFleetPackageRegistry, logFleetPackageRegistryHint } from './fleet_package_registry';

describe('getFleetPackageRegistry', () => {
  it('is disabled when neither variable is set', () => {
    expect(getFleetPackageRegistry({})).toMatchObject({
      enabled: false,
      port: undefined,
      kbnServerArgs: [],
    });
  });

  it('is disabled with the port alone, which CI exports for every job', () => {
    expect(getFleetPackageRegistry({ FLEET_PACKAGE_REGISTRY_PORT: '6104' })).toMatchObject({
      enabled: false,
      port: 6104,
      kbnServerArgs: [],
    });
  });

  it.each(['true', 'TRUE', '1'])('is enabled with the opt-in set to %s and a port', (value) => {
    expect(
      getFleetPackageRegistry({
        FLEET_PACKAGE_REGISTRY_PORT: '6104',
        SCOUT_FLEET_PACKAGE_REGISTRY: value,
      })
    ).toMatchObject({
      enabled: true,
      port: 6104,
      kbnServerArgs: ['--xpack.fleet.registryUrl=http://localhost:6104'],
    });
  });

  it('is disabled with the opt-in set to anything else', () => {
    expect(
      getFleetPackageRegistry({
        FLEET_PACKAGE_REGISTRY_PORT: '6104',
        SCOUT_FLEET_PACKAGE_REGISTRY: 'false',
      }).enabled
    ).toBe(false);
  });

  it('builds the docker server entry for the base configs from the shared registry spec', () => {
    const enabled = getFleetPackageRegistry({
      FLEET_PACKAGE_REGISTRY_PORT: '6104',
      SCOUT_FLEET_PACKAGE_REGISTRY: 'true',
    }).dockerServer;
    expect(enabled).toMatchObject({
      enabled: true,
      port: 6104,
      portInContainer: 8080,
      waitForLogLine: 'package manifests loaded',
      waitForLogLineTimeoutMs: 6 * 60 * 1000,
    });
    expect(enabled.image).toContain('package-registry');

    expect(getFleetPackageRegistry({}).dockerServer).toMatchObject({ enabled: false });
  });

  it('fails fast when the opt-in is set without a port', () => {
    expect(() => getFleetPackageRegistry({ SCOUT_FLEET_PACKAGE_REGISTRY: 'true' })).toThrow(
      /FLEET_PACKAGE_REGISTRY_PORT is not/
    );
  });

  it('fails fast on a port that is not a number when opted in', () => {
    expect(() =>
      getFleetPackageRegistry({
        FLEET_PACKAGE_REGISTRY_PORT: 'abc',
        SCOUT_FLEET_PACKAGE_REGISTRY: 'true',
      })
    ).toThrow(/must be a valid port number/);
  });

  it('ignores a bad port without the opt-in, so runs that never asked for the registry still boot', () => {
    expect(getFleetPackageRegistry({ FLEET_PACKAGE_REGISTRY_PORT: 'abc' })).toMatchObject({
      enabled: false,
      port: undefined,
      kbnServerArgs: [],
    });
  });
});

describe('logFleetPackageRegistryHint', () => {
  const logWith = () => {
    const log = new ToolingLog({ level: 'silent', writeTo: process.stdout });
    const info = jest.spyOn(log, 'info');
    return { log, info };
  };

  it('explains why the registry is not started when only the port is set', () => {
    const { log, info } = logWith();
    logFleetPackageRegistryHint(log, { FLEET_PACKAGE_REGISTRY_PORT: '6104' });
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('SCOUT_FLEET_PACKAGE_REGISTRY is not')
    );
  });

  it('says nothing when the registry is enabled or the port is unset', () => {
    const { log, info } = logWith();
    logFleetPackageRegistryHint(log, {
      FLEET_PACKAGE_REGISTRY_PORT: '6104',
      SCOUT_FLEET_PACKAGE_REGISTRY: 'true',
    });
    logFleetPackageRegistryHint(log, {});
    expect(info).not.toHaveBeenCalled();
  });
});
