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

import { resolve } from 'path';
import process from 'process';

import { pkg } from '../../../utils/package_json';

interface PackageInfo {
  version: string;
  branch: string;
  buildNum: number;
  buildSha: string;
}

interface EnvironmentMode {
  name: 'development' | 'production';
  dev: boolean;
  prod: boolean;
}

export interface EnvOptions {
  configs: string[];
  cliArgs: CliArgs;
  isDevClusterMaster: boolean;
}

export interface CliArgs {
  dev: boolean;
  envName?: string;
  quiet: boolean;
  silent: boolean;
  watch: boolean;
  repl: boolean;
  basePath: boolean;
  optimize: boolean;
}

export class Env {
  /**
   * @internal
   */
  public static createDefault(options: EnvOptions): Env {
    return new Env(process.cwd(), options);
  }

  public readonly configDir: string;
  public readonly corePluginsDir: string;
  public readonly binDir: string;
  public readonly logDir: string;
  public readonly staticFilesDir: string;

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
   */
  public readonly cliArgs: Readonly<CliArgs>;

  /**
   * Paths to the configuration files.
   */
  public readonly configs: ReadonlyArray<string>;

  /**
   * Indicates that this Kibana instance is run as development Node Cluster master.
   */
  public readonly isDevClusterMaster: boolean;

  /**
   * @internal
   */
  constructor(readonly homeDir: string, options: EnvOptions) {
    this.configDir = resolve(this.homeDir, 'config');
    this.corePluginsDir = resolve(this.homeDir, 'core_plugins');
    this.binDir = resolve(this.homeDir, 'bin');
    this.logDir = resolve(this.homeDir, 'log');
    this.staticFilesDir = resolve(this.homeDir, 'ui');

    this.cliArgs = Object.freeze(options.cliArgs);
    this.configs = Object.freeze(options.configs);
    this.isDevClusterMaster = options.isDevClusterMaster;

    const isDevMode = this.cliArgs.dev || this.cliArgs.envName === 'development';
    this.mode = Object.freeze<EnvironmentMode>({
      dev: isDevMode,
      name: isDevMode ? 'development' : 'production',
      prod: !isDevMode,
    });

    const isKibanaDistributable = pkg.build && pkg.build.distributable === true;
    this.packageInfo = Object.freeze({
      branch: pkg.branch,
      buildNum: isKibanaDistributable ? pkg.build.number : Number.MAX_SAFE_INTEGER,
      buildSha: isKibanaDistributable ? pkg.build.sha : 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      version: pkg.version,
    });
  }
}
