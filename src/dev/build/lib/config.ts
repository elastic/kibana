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

import { dirname, resolve, relative } from 'path';
import os from 'os';
import loadJsonFile from 'load-json-file';

import { getVersionInfo, VersionInfo } from './version_info';
import { PlatformName, PlatformArchitecture, ALL_PLATFORMS } from './platform';

interface Options {
  isRelease: boolean;
  targetAllPlatforms: boolean;
  versionQualifier?: string;
}

interface Package {
  version: string;
  engines: { node: string };
  workspaces: {
    packages: string[];
  };
  [key: string]: unknown;
}

export class Config {
  static async create({ isRelease, targetAllPlatforms, versionQualifier }: Options) {
    const pkgPath = resolve(__dirname, '../../../../package.json');
    const pkg: Package = loadJsonFile.sync(pkgPath);

    return new Config(
      targetAllPlatforms,
      pkg,
      pkg.engines.node,
      dirname(pkgPath),
      await getVersionInfo({
        isRelease,
        versionQualifier,
        pkg,
      }),
      isRelease
    );
  }

  constructor(
    private readonly targetAllPlatforms: boolean,
    private readonly pkg: Package,
    private readonly nodeVersion: string,
    private readonly repoRoot: string,
    private readonly versionInfo: VersionInfo,
    public readonly isRelease: boolean
  ) {}

  /**
   * Get Kibana's parsed package.json file
   */
  getKibanaPkg() {
    return this.pkg;
  }

  /**
   * Get the node version required by Kibana
   */
  getNodeVersion() {
    return this.nodeVersion;
  }

  /**
   * Convert an absolute path to a relative path, based from the repo
   */
  getRepoRelativePath(absolutePath: string) {
    return relative(this.repoRoot, absolutePath);
  }

  /**
   * Resolve a set of relative paths based from the directory of the Kibana repo
   */
  resolveFromRepo(...subPaths: string[]) {
    return resolve(this.repoRoot, ...subPaths);
  }

  /**
   * Return the list of Platforms we are targeting, if --this-platform flag is
   * specified only the platform for this OS will be returned
   */
  getTargetPlatforms() {
    if (this.targetAllPlatforms) {
      return ALL_PLATFORMS;
    }

    return [this.getPlatformForThisOs()];
  }

  /**
   * Return the list of Platforms we need/have node downloads for. We always
   * include the linux platform even if we aren't targeting linux so we can
   * reliably get the LICENSE file, which isn't included in the windows version
   */
  getNodePlatforms() {
    if (this.targetAllPlatforms) {
      return ALL_PLATFORMS;
    }

    if (process.platform === 'linux') {
      return [this.getPlatform('linux', 'x64')];
    }

    return [this.getPlatformForThisOs(), this.getPlatform('linux', 'x64')];
  }

  getPlatform(name: PlatformName, arch: PlatformArchitecture) {
    const selected = ALL_PLATFORMS.find((p) => {
      return name === p.getName() && arch === p.getArchitecture();
    });

    if (!selected) {
      throw new Error(`Unable to find platform (${name}) with architecture (${arch})`);
    }

    return selected;
  }

  /**
   * Get the platform object representing the OS on this machine
   */
  getPlatformForThisOs() {
    return this.getPlatform(os.platform() as PlatformName, os.arch() as PlatformArchitecture);
  }

  /**
   * Get the version to use for this build
   */
  getBuildVersion() {
    return this.versionInfo.buildVersion;
  }

  /**
   * Get the build number of this build
   */
  getBuildNumber() {
    return this.versionInfo.buildNumber;
  }

  /**
   * Get the git sha for this build
   */
  getBuildSha() {
    return this.versionInfo.buildSha;
  }

  /**
   * Resolve a set of paths based from the target directory for this build.
   */
  resolveFromTarget(...subPaths: string[]) {
    return resolve(this.repoRoot, 'target', ...subPaths);
  }
}
