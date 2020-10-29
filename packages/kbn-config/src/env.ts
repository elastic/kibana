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

import { resolve, join } from 'path';
import loadJsonFile from 'load-json-file';
import { getPluginSearchPaths } from './plugins';
import { PackageInfo, EnvironmentMode } from './types';

/** @internal */
export interface EnvOptions {
  configs: string[];
  cliArgs: CliArgs;
  isDevClusterMaster: boolean;
}

/** @internal */
export interface CliArgs {
  dev: boolean;
  envName?: string;
  quiet: boolean;
  silent: boolean;
  watch: boolean;
  repl: boolean;
  basePath: boolean;
  open: boolean;
  oss: boolean;
  /** @deprecated use disableOptimizer to know if the @kbn/optimizer is disabled in development */
  optimize?: boolean;
  runExamples: boolean;
  disableOptimizer: boolean;
  cache: boolean;
  dist: boolean;
}

/** @internal */
export interface RawPackageInfo {
  branch: string;
  version: string;
  build: {
    distributable?: boolean;
    number: number;
    sha: string;
  };
}

export class Env {
  /**
   * @internal
   */
  public static createDefault(repoRoot: string, options: EnvOptions, pkg?: RawPackageInfo): Env {
    if (!pkg) {
      pkg = loadJsonFile.sync(join(repoRoot, 'package.json')) as RawPackageInfo;
    }
    return new Env(repoRoot, pkg, options);
  }

  /** @internal */
  public readonly configDir: string;
  /** @internal */
  public readonly binDir: string;
  /** @internal */
  public readonly logDir: string;
  /** @internal */
  public readonly pluginSearchPaths: readonly string[];

  /**
   * Information about Kibana package (version, build number etc.).
   */
  public readonly packageInfo: Readonly<PackageInfo>;

  /**
   * Mode Kibana currently run in (development or production).
   */
  public readonly mode: Readonly<EnvironmentMode>;

  /**
   * Arguments provided through command line.
   * @internal
   */
  public readonly cliArgs: Readonly<CliArgs>;

  /**
   * Paths to the configuration files.
   * @internal
   */
  public readonly configs: readonly string[];

  /**
   * Indicates that this Kibana instance is run as development Node Cluster master.
   * @internal
   */
  public readonly isDevClusterMaster: boolean;

  /**
   * @internal
   */
  constructor(public readonly homeDir: string, pkg: RawPackageInfo, options: EnvOptions) {
    this.configDir = resolve(this.homeDir, 'config');
    this.binDir = resolve(this.homeDir, 'bin');
    this.logDir = resolve(this.homeDir, 'log');

    this.pluginSearchPaths = getPluginSearchPaths({
      rootDir: this.homeDir,
      oss: options.cliArgs.oss,
      examples: options.cliArgs.runExamples,
    });

    this.cliArgs = Object.freeze(options.cliArgs);
    this.configs = Object.freeze(options.configs);
    this.isDevClusterMaster = options.isDevClusterMaster;

    const isDevMode = this.cliArgs.dev || this.cliArgs.envName === 'development';
    this.mode = Object.freeze<EnvironmentMode>({
      dev: isDevMode,
      name: isDevMode ? 'development' : 'production',
      prod: !isDevMode,
    });

    const isKibanaDistributable = Boolean(pkg.build && pkg.build.distributable === true);
    this.packageInfo = Object.freeze({
      branch: pkg.branch,
      buildNum: isKibanaDistributable ? pkg.build.number : Number.MAX_SAFE_INTEGER,
      buildSha: isKibanaDistributable ? pkg.build.sha : 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      version: pkg.version,
      dist: isKibanaDistributable,
    });
  }
}
