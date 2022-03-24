/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  dockerCrossCompile: boolean;
  dockerTagQualifier: string | null;
  dockerPush: boolean;
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
  static async create({
    isRelease,
    targetAllPlatforms,
    versionQualifier,
    dockerCrossCompile,
    dockerTagQualifier,
    dockerPush,
  }: Options) {
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
      dockerCrossCompile,
      dockerTagQualifier,
      dockerPush,
      isRelease
    );
  }

  constructor(
    private readonly targetAllPlatforms: boolean,
    private readonly pkg: Package,
    private readonly nodeVersion: string,
    private readonly repoRoot: string,
    private readonly versionInfo: VersionInfo,
    private readonly dockerCrossCompile: boolean,
    private readonly dockerTagQualifier: string | null,
    private readonly dockerPush: boolean,
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
   * Get the docker tag qualifier
   */
  getDockerTagQualfiier() {
    return this.dockerTagQualifier;
  }

  /**
   * Get docker push
   */
  getDockerPush() {
    return this.dockerPush;
  }

  /**
   * Get docker cross compile
   */
  getDockerCrossCompile() {
    return this.dockerCrossCompile;
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
