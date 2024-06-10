/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type PlatformName = 'win32' | 'darwin' | 'linux';
export type PlatformArchitecture = 'x64' | 'arm64';
export type Variant = 'serverless' | null;

export class Platform {
  constructor(
    private name: PlatformName,
    private architecture: PlatformArchitecture,
    private buildName: string,
    private variant: Variant
  ) {}

  getName() {
    return this.name;
  }

  getArchitecture() {
    return this.architecture;
  }

  getBuildName() {
    return this.buildName;
  }

  getNodeArch() {
    return `${this.name}-${this.architecture}`;
  }

  getVariant() {
    return this.variant;
  }

  isWindows() {
    return this.name === 'win32';
  }

  isMac() {
    return this.name === 'darwin';
  }

  isLinux() {
    return this.name === 'linux';
  }

  isServerless() {
    return this.variant === 'serverless';
  }
}

export const DOWNLOAD_PLATFORMS = [
  new Platform('linux', 'x64', 'linux-x86_64', null),
  new Platform('linux', 'arm64', 'linux-aarch64', null),
  new Platform('darwin', 'x64', 'darwin-x86_64', null),
  new Platform('darwin', 'arm64', 'darwin-aarch64', null),
  new Platform('win32', 'x64', 'windows-x86_64', null),
];

export const SERVERLESS_PLATFORMS = [
  new Platform('linux', 'x64', 'linux-x86_64', 'serverless'),
  new Platform('linux', 'arm64', 'linux-aarch64', 'serverless'),
];

export const ALL_PLATFORMS = [...DOWNLOAD_PLATFORMS, ...SERVERLESS_PLATFORMS];
