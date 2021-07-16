/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Os from 'os';

import { ApiPackage } from './snapshot_build';

const findApiPackage = (pkgs: ApiPackage[], os: string, arch: string, type: string) =>
  pkgs.find((pkg) => pkg.type === type && pkg.os?.includes(os) && pkg.architecture === arch);

export const getThisPlatform = () => {
  const platform = Os.platform();

  switch (platform) {
    case 'darwin':
      return MAC_PLATFORM;
    case 'win32':
      return WINDOWS_PLATFORM;
    case 'linux':
      return Os.arch() === 'arm64' ? LINUX_ARM_PLATFORM : LINUX_PLATFORM;
  }

  throw new Error(`unsupported platform ${platform}`);
};

export interface Platform {
  readonly optional?: true;
  readonly archiveName: string;
  readonly executableName: string;
  readonly archiveType: 'zip' | 'tar';
  getApiPackage(packages: ApiPackage[]): ApiPackage | undefined;
}

export const WINDOWS_PLATFORM: Platform = {
  archiveName: 'windows.zip',
  executableName: 'apm-server.exe',
  archiveType: 'zip',
  getApiPackage(packages) {
    return findApiPackage(packages, 'windows', 'x86_64', 'zip');
  },
};

export const LINUX_PLATFORM: Platform = {
  archiveName: 'linux.tar.gz',
  executableName: 'apm-server',
  archiveType: 'tar',
  getApiPackage(packages) {
    return findApiPackage(packages, 'linux', 'x86_64', 'tar');
  },
};

export const LINUX_ARM_PLATFORM: Platform = {
  optional: true,
  archiveName: 'linux_arm.tar.gz',
  executableName: 'apm-server',
  archiveType: 'tar',
  getApiPackage(packages) {
    return findApiPackage(packages, 'linux', 'arm64', 'tar');
  },
};

export const MAC_PLATFORM: Platform = {
  archiveName: 'mac.tar.gz',
  executableName: 'apm-server',
  archiveType: 'tar',
  getApiPackage(packages) {
    return findApiPackage(packages, 'darwin', 'x86_64', 'tar');
  },
};

export const PLATFORMS: Platform[] = [
  WINDOWS_PLATFORM,
  LINUX_PLATFORM,
  LINUX_ARM_PLATFORM,
  MAC_PLATFORM,
];
