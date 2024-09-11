/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('getos', () => jest.fn());

import { getDefaultChromiumSandboxDisabled } from './default_chromium_sandbox_disabled';
import getos from 'getos';

describe('getDefaultChromiumSandboxDisabled', () => {
  it.each`
    os          | dist               | release     | expected
    ${'win32'}  | ${'Windows'}       | ${'11'}     | ${false}
    ${'darwin'} | ${'macOS'}         | ${'11.2.3'} | ${false}
    ${'linux'}  | ${'Centos'}        | ${'7.0'}    | ${true}
    ${'linux'}  | ${'Red Hat Linux'} | ${'7.0'}    | ${true}
    ${'linux'}  | ${'Ubuntu Linux'}  | ${'14.04'}  | ${false}
    ${'linux'}  | ${'Ubuntu Linux'}  | ${'16.04'}  | ${false}
    ${'linux'}  | ${'SUSE Linux'}    | ${'11'}     | ${false}
    ${'linux'}  | ${'SUSE Linux'}    | ${'12'}     | ${false}
    ${'linux'}  | ${'SUSE Linux'}    | ${'42.0'}   | ${false}
    ${'linux'}  | ${'Debian'}        | ${'8'}      | ${true}
    ${'linux'}  | ${'Debian'}        | ${'9'}      | ${true}
  `('should return $expected for $dist $release', async ({ expected, ...os }) => {
    (getos as jest.Mock).mockImplementation((cb) => cb(null, os));

    await expect(getDefaultChromiumSandboxDisabled()).resolves.toHaveProperty(
      'disableSandbox',
      expected
    );
  });
});

describe('Docker', () => {
  const mockOs = { os: 'linux', dist: 'Ubuntu Linux', release: '20.01' };

  it('Non-Docker', async () => {
    (getos as jest.Mock).mockImplementation((cb) => cb(null, mockOs));

    await expect(getDefaultChromiumSandboxDisabled()).resolves.toHaveProperty(
      'disableSandbox',
      false
    );
  });

  it('Elastic Docker container', async () => {
    // setup: mock environment variables
    const env = { ...process.env };
    process.env.ELASTIC_CONTAINER = 'true';

    (getos as jest.Mock).mockImplementation((cb) => cb(null, mockOs));

    await expect(getDefaultChromiumSandboxDisabled()).resolves.toHaveProperty(
      'disableSandbox',
      true
    );

    // cleanup: restore the environment variables
    process.env = env;
  });
});
