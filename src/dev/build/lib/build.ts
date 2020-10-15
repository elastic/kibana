/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
