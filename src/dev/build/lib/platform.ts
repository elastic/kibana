/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaSolution } from '@kbn/projects-solutions-groups';

export type PlatformName = 'win32' | 'darwin' | 'linux';
export type PlatformArchitecture = 'x64' | 'arm64';
export type Variant = 'serverless' | null;
export type Solution = KibanaSolution | null;

export class Platform {
  constructor(
    private name: PlatformName,
    private architecture: PlatformArchitecture,
    private buildName: string,
    private variant: Variant,
    private solution: Solution
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

  getSolution() {
    return this.solution;
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

  toString() {
    const variant = this.variant ? `-${this.variant}` : '';
    const solution = this.solution ? `-${this.solution}` : '';
    return `${this.name}-${this.architecture}${variant}${solution}`;
  }
}

export const DOWNLOAD_PLATFORMS = [
  new Platform('linux', 'x64', 'linux-x86_64', null, null),
  new Platform('linux', 'arm64', 'linux-aarch64', null, null),
  new Platform('darwin', 'x64', 'darwin-x86_64', null, null),
  new Platform('darwin', 'arm64', 'darwin-aarch64', null, null),
  new Platform('win32', 'x64', 'windows-x86_64', null, null),
  new Platform('win32', 'arm64', 'windows-arm64', null, null),
];

export const SERVERLESS_PLATFORMS = [
  new Platform('linux', 'x64', 'linux-x86_64', 'serverless', null),
  new Platform('linux', 'arm64', 'linux-aarch64', 'serverless', null),

  new Platform('linux', 'x64', 'linux-x86_64', 'serverless', 'workplaceai'),
  new Platform('linux', 'arm64', 'linux-aarch64', 'serverless', 'workplaceai'),

  new Platform('linux', 'x64', 'linux-x86_64', 'serverless', 'observability'),
  new Platform('linux', 'arm64', 'linux-aarch64', 'serverless', 'observability'),

  new Platform('linux', 'x64', 'linux-x86_64', 'serverless', 'search'),
  new Platform('linux', 'arm64', 'linux-aarch64', 'serverless', 'search'),

  new Platform('linux', 'x64', 'linux-x86_64', 'serverless', 'security'),
  new Platform('linux', 'arm64', 'linux-aarch64', 'serverless', 'security'),
];

export const ALL_PLATFORMS = [...DOWNLOAD_PLATFORMS, ...SERVERLESS_PLATFORMS];
