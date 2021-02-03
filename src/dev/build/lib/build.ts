/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import chalk from 'chalk';

import { Config } from './config';
import { Platform } from './platform';

export class Build {
  private name = this.oss ? 'kibana-oss' : 'kibana';
  private logTag = this.oss ? chalk`{magenta [kibana-oss]}` : chalk`{cyan [  kibana  ]}`;

  constructor(private config: Config, private oss: boolean) {}

  isOss() {
    return !!this.oss;
  }

  resolvePath(...args: string[]) {
    return this.config.resolveFromRepo('build', this.name, ...args);
  }

  resolvePathForPlatform(platform: Platform, ...args: string[]) {
    return this.config.resolveFromRepo(
      'build',
      this.oss ? 'oss' : 'default',
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

  getName() {
    return this.name;
  }

  getLogTag() {
    return this.logTag;
  }
}
