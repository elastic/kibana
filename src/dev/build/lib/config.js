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
import { platform as getOsPlatform } from 'os';

import { getVersionInfo } from './version_info';
import { createPlatform } from './platform';

export async function getConfig({ isRelease, targetAllPlatforms, versionQualifier }) {
  const pkgPath = resolve(__dirname, '../../../../package.json');
  const pkg = require(pkgPath); // eslint-disable-line import/no-dynamic-require
  const repoRoot = dirname(pkgPath);
  const nodeVersion = pkg.engines.node;

  const platforms = ['darwin', 'linux', 'windows'].map(createPlatform);

  const versionInfo = await getVersionInfo({
    isRelease,
    versionQualifier,
    pkg,
  });

  return new (class Config {
    /**
     * Get Kibana's parsed package.json file
     * @return {Object}
     */
    getKibanaPkg() {
      return pkg;
    }

    isRelease() {
      return isRelease;
    }

    /**
     * Get the node version required by Kibana
     * @return {String}
     */
    getNodeVersion() {
      return nodeVersion;
    }

    /**
     * Convert an absolute path to a relative path, based from the repo
     * @param  {String} absolutePath
     * @return {String}
     */
    getRepoRelativePath(absolutePath) {
      return relative(repoRoot, absolutePath);
    }

    /**
     * Resolve a set of relative paths based from the directory of the Kibana repo
     * @param  {...String} ...subPaths
     * @return {String}
     */
    resolveFromRepo(...subPaths) {
      return resolve(repoRoot, ...subPaths);
    }

    /**
     * Return the list of Platforms we are targeting, if --this-platform flag is
     * specified only the platform for this OS will be returned
     * @return {Array<Platform>}
     */
    getTargetPlatforms() {
      if (targetAllPlatforms) {
        return platforms;
      }

      return [this.getPlatformForThisOs()];
    }

    /**
     * Return the list of Platforms we need/have node downloads for. We always
     * include the linux platform even if we aren't targeting linux so we can
     * reliably get the LICENSE file, which isn't included in the windows version
     * @return {Array<Platform>}
     */
    getNodePlatforms() {
      if (targetAllPlatforms) {
        return platforms;
      }

      if (process.platform === 'linux') {
        return [this.getLinuxPlatform()];
      }

      return [this.getPlatformForThisOs(), this.getLinuxPlatform()];
    }

    /**
     * Get the linux platform object
     * @return {Platform}
     */
    getLinuxPlatform() {
      return platforms.find((p) => p.isLinux());
    }

    /**
     * Get the windows platform object
     * @return {Platform}
     */
    getWindowsPlatform() {
      return platforms.find((p) => p.isWindows());
    }

    /**
     * Get the mac platform object
     * @return {Platform}
     */
    getMacPlatform() {
      return platforms.find((p) => p.isMac());
    }

    /**
     * Get the platform object representing the OS on this machine
     * @return {Platform}
     */
    getPlatformForThisOs() {
      switch (getOsPlatform()) {
        case 'darwin':
          return this.getMacPlatform();
        case 'win32':
          return this.getWindowsPlatform();
        case 'linux':
          return this.getLinuxPlatform();
        default:
          throw new Error(`Unable to find platform for this os`);
      }
    }

    /**
     * Get the version to use for this build
     * @return {String}
     */
    getBuildVersion() {
      return versionInfo.buildVersion;
    }

    /**
     * Get the build number of this build
     * @return {Number}
     */
    getBuildNumber() {
      return versionInfo.buildNumber;
    }

    /**
     * Get the git sha for this build
     * @return {String}
     */
    getBuildSha() {
      return versionInfo.buildSha;
    }

    /**
     * Resolve a set of paths based from the target directory for this build.
     * @param  {...String} ...subPaths
     * @return {String}
     */
    resolveFromTarget(...subPaths) {
      return resolve(repoRoot, 'target', ...subPaths);
    }
  })();
}
