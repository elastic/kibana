/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';

import { Config } from './config';
import { Platform } from './platform';

export class Build {
  private name = 'kibana';
  private logTag = chalk`{cyan [  kibana  ]}`;

  constructor(private config: Config) {}

  resolvePath(...args: string[]) {
    return this.config.resolveFromRepo('build', this.name, ...args);
  }

  resolvePathForPlatform(platform: Platform, ...args: string[]) {
    const variant = platform.getVariant() ? `-${platform.getVariant()}` : '';
    return this.config.resolveFromRepo(
      'build',
      'default',
      `kibana${variant}-${this.config.getBuildVersion()}-${platform.getBuildName()}`,
      ...args
    );
  }

  getPlatformArchivePath(platform: Platform) {
    const ext = platform.isWindows() ? 'zip' : 'tar.gz';
    const variant = platform.getVariant() ? `-${platform.getVariant()}` : '';
    return this.config.resolveFromRepo(
      'target',
      `${this.name}${variant}-${this.config.getBuildVersion()}-${platform.getBuildName()}.${ext}`
    );
  }

  getRootDirectory() {
    return `${this.name}-${this.config.getBuildVersion()}`;
  }

  getName() {
    return this.name;
  }

  getLogTag() {
    return this.logTag;
  }
}
