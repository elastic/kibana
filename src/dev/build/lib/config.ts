/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import os from 'os';

import { REPO_ROOT, kibanaPackageJson, KibanaPackageJson } from '@kbn/repo-info';
import {
  Package,
  getPackages,
  PluginSelector,
  PluginPackage,
  getPluginPackagesFilter,
} from '@kbn/repo-packages';

import { getVersionInfo, VersionInfo } from './version_info';
import {
  PlatformName,
  PlatformArchitecture,
  ALL_PLATFORMS,
  SERVERLESS_PLATFORMS,
} from './platform';

interface Options {
  isRelease: boolean;
  targetAllPlatforms: boolean;
  targetServerlessPlatforms: boolean;
  versionQualifier?: string;
  dockerContextUseLocalArtifact: boolean | null;
  dockerCrossCompile: boolean;
  dockerNamespace: string | null;
  dockerTag: string | null;
  dockerTagQualifier: string | null;
  dockerPush: boolean;
  withExamplePlugins: boolean;
  withTestPlugins: boolean;
  downloadFreshNode: boolean;
}

export class Config {
  static async create(opts: Options) {
    const nodeVersion = kibanaPackageJson.engines?.node;
    if (!nodeVersion) {
      throw new Error('missing node version in package.json');
    }

    return new Config(
      opts.targetAllPlatforms,
      opts.targetServerlessPlatforms,
      kibanaPackageJson,
      nodeVersion,
      REPO_ROOT,
      await getVersionInfo({
        isRelease: opts.isRelease,
        versionQualifier: opts.versionQualifier,
        pkg: kibanaPackageJson,
      }),
      opts.dockerContextUseLocalArtifact,
      opts.dockerCrossCompile,
      opts.dockerNamespace,
      opts.dockerTag,
      opts.dockerTagQualifier,
      opts.dockerPush,
      opts.isRelease,
      opts.downloadFreshNode,
      {
        examples: opts.withExamplePlugins,
        testPlugins: opts.withTestPlugins,
      }
    );
  }

  private readonly pluginFilter: (pkg: Package) => pkg is PluginPackage;

  constructor(
    private readonly targetAllPlatforms: boolean,
    private readonly targetServerlessPlatforms: boolean,
    private readonly pkg: KibanaPackageJson,
    private readonly nodeVersion: string,
    private readonly repoRoot: string,
    private readonly versionInfo: VersionInfo,
    private readonly dockerContextUseLocalArtifact: boolean | null,
    private readonly dockerCrossCompile: boolean,
    private readonly dockerNamespace: string | null,
    private readonly dockerTag: string | null,
    private readonly dockerTagQualifier: string | null,
    private readonly dockerPush: boolean,
    public readonly isRelease: boolean,
    public readonly downloadFreshNode: boolean,
    public readonly pluginSelector: PluginSelector
  ) {
    this.pluginFilter = getPluginPackagesFilter(this.pluginSelector);
  }

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
  getDockerTag() {
    return this.dockerTag;
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
   * Get docker repository namespace
   */
  getDockerNamespace() {
    return this.dockerNamespace;
  }

  /**
   * Use a local Kibana distribution when producing a docker context
   */
  getDockerContextUseLocalArtifact() {
    return this.dockerContextUseLocalArtifact;
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
    return Path.relative(this.repoRoot, absolutePath);
  }

  /**
   * Resolve a set of relative paths based from the directory of the Kibana repo
   */
  resolveFromRepo(...subPaths: string[]) {
    return Path.resolve(this.repoRoot, ...subPaths);
  }

  /**
   * Return the list of Platforms we are targeting, if --this-platform flag is
   * specified only the platform for this OS will be returned
   */
  getTargetPlatforms() {
    if (this.targetServerlessPlatforms) {
      return SERVERLESS_PLATFORMS;
    }
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
    if (this.targetServerlessPlatforms) {
      return SERVERLESS_PLATFORMS;
    }
    if (this.targetAllPlatforms) {
      return ALL_PLATFORMS;
    }

    if (process.platform === 'linux' && process.arch === 'x64') {
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
   * Get the first 12 digits of the git sha for this build
   */
  getBuildShaShort() {
    return this.versionInfo.buildShaShort;
  }

  /**
   * Get the ISO 8601 date for this build
   */
  getBuildDate() {
    return this.versionInfo.buildDate;
  }

  /**
   * Resolve a set of paths based from the target directory for this build.
   */
  resolveFromTarget(...subPaths: string[]) {
    return Path.resolve(this.repoRoot, 'target', ...subPaths);
  }

  getDistPackagesFromRepo() {
    return getPackages(this.repoRoot).filter(
      (p) =>
        (this.pluginSelector.testPlugins || !p.isDevOnly()) &&
        (!p.isPlugin() || (this.pluginFilter(p) && !p.isDevOnly()))
    );
  }

  getDistPluginsFromRepo() {
    return getPackages(this.repoRoot).filter((p) => !p.isDevOnly() && this.pluginFilter(p));
  }
}
