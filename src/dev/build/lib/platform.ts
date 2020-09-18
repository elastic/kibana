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

export type PlatformName = 'win32' | 'darwin' | 'linux';
export type PlatformArchitecture = 'x64' | 'arm64';

export class Platform {
  constructor(
    private name: PlatformName,
    private architecture: PlatformArchitecture,
    private buildName: string
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

  isWindows() {
    return this.name === 'win32';
  }

  isMac() {
    return this.name === 'darwin';
  }

  isLinux() {
    return this.name === 'linux';
  }
}

export const ALL_PLATFORMS = [
  new Platform('linux', 'x64', 'linux-x86_64'),
  new Platform('linux', 'arm64', 'linux-aarch64'),
  new Platform('darwin', 'x64', 'darwin-x86_64'),
  new Platform('win32', 'x64', 'windows-x86_64'),
];
