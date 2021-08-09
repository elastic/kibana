/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
    return this.config.resolveFromRepo(
      'build',
      'default',
      `kibana-${this.config.getBuildVersion()}-${platform.getBuildName()}`,
      ...args
    );
  }

  getPlatformArchivePath(platform: Platform) {
    const ext = platform.isWindows() ? 'zip' : 'tar.gz';
    return this.config.resolveFromRepo(
      'target',
      `${this.name}-${this.config.getBuildVersion()}-${platform.getBuildName()}.${ext}`
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
