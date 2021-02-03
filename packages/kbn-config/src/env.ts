/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve, join } from 'path';
import loadJsonFile from 'load-json-file';
import { getPluginSearchPaths } from './plugins';
import { PackageInfo, EnvironmentMode } from './types';

/** @internal */
export interface EnvOptions {
  configs: string[];
  cliArgs: CliArgs;
  isDevCliParent: boolean;
}

/** @internal */
export interface CliArgs {
  dev: boolean;
  envName?: string;
  quiet: boolean;
  silent: boolean;
  watch: boolean;
  basePath: boolean;
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
   * Indicates that this Kibana instance is running in the parent process of the dev cli.
   * @internal
   */
  public readonly isDevCliParent: boolean;

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
    this.isDevCliParent = options.isDevCliParent;

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
