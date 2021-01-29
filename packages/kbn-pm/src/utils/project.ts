/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';
import { inspect } from 'util';

import { CliError } from './errors';
import { log } from './log';
import {
  IPackageDependencies,
  IPackageJson,
  IPackageScripts,
  isLinkDependency,
  readPackageJson,
} from './package_json';
import { installInDir, runScriptInPackage, runScriptInPackageStreaming } from './scripts';

interface BuildConfig {
  skip?: boolean;
  intermediateBuildDirectory?: string;
  oss?: boolean;
}

interface CleanConfig {
  extraPatterns?: string[];
}

export class Project {
  public static async fromPath(path: string) {
    const pkgJson = await readPackageJson(path);
    return new Project(pkgJson, path);
  }

  /** parsed package.json */
  public readonly json: IPackageJson;
  /** absolute path to the package.json file in the project */
  public readonly packageJsonLocation: string;
  /** absolute path to the node_modules in the project (might not actually exist) */
  public readonly nodeModulesLocation: string;
  /** absolute path to the target directory in the project (might not actually exist) */
  public readonly targetLocation: string;
  /** absolute path to the directory containing the project */
  public readonly path: string;
  /** the version of the project */
  public readonly version: string;
  /** merged set of dependencies of the project, [name => version range] */
  public readonly allDependencies: IPackageDependencies;
  /** regular dependencies of the project, [name => version range] */
  public readonly productionDependencies: IPackageDependencies;
  /** development dependencies of the project, [name => version range] */
  public readonly devDependencies: IPackageDependencies;
  /** scripts defined in the package.json file for the project [name => body] */
  public readonly scripts: IPackageScripts;

  public isSinglePackageJsonProject = false;

  constructor(packageJson: IPackageJson, projectPath: string) {
    this.json = Object.freeze(packageJson);
    this.path = projectPath;

    this.packageJsonLocation = Path.resolve(this.path, 'package.json');
    this.nodeModulesLocation = Path.resolve(this.path, 'node_modules');
    this.targetLocation = Path.resolve(this.path, 'target');

    this.version = this.json.version;
    this.productionDependencies = this.json.dependencies || {};
    this.devDependencies = this.json.devDependencies || {};
    this.allDependencies = {
      ...this.devDependencies,
      ...this.productionDependencies,
    };
    this.isSinglePackageJsonProject = this.json.name === 'kibana';

    this.scripts = this.json.scripts || {};
  }

  public get name(): string {
    return this.json.name;
  }

  public ensureValidProjectDependency(project: Project) {
    const relativePathToProject = normalizePath(Path.relative(this.path, project.path));

    const versionInPackageJson = this.allDependencies[project.name];
    const expectedVersionInPackageJson = `link:${relativePathToProject}`;

    // TODO: after introduce bazel to build packages do not allow child projects
    // to hold dependencies

    if (versionInPackageJson === expectedVersionInPackageJson) {
      return;
    }

    const updateMsg = 'Update its package.json to the expected value below.';
    const meta = {
      actual: `"${project.name}": "${versionInPackageJson}"`,
      expected: `"${project.name}": "${expectedVersionInPackageJson}"`,
      package: `${this.name} (${this.packageJsonLocation})`,
    };

    if (isLinkDependency(versionInPackageJson)) {
      throw new CliError(
        `[${this.name}] depends on [${project.name}] using 'link:', but the path is wrong. ${updateMsg}`,
        meta
      );
    }

    throw new CliError(
      `[${this.name}] depends on [${project.name}] but it's not using the local package. ${updateMsg}`,
      meta
    );
  }

  public getBuildConfig(): BuildConfig {
    return (this.json.kibana && this.json.kibana.build) || {};
  }

  /**
   * Returns the directory that should be copied into the Kibana build artifact.
   * This config can be specified to only include the project's build artifacts
   * instead of everything located in the project directory.
   */
  public getIntermediateBuildDirectory() {
    return Path.resolve(this.path, this.getBuildConfig().intermediateBuildDirectory || '.');
  }

  public getCleanConfig(): CleanConfig {
    return (this.json.kibana && this.json.kibana.clean) || {};
  }

  public isFlaggedAsDevOnly() {
    return !!(this.json.kibana && this.json.kibana.devOnly);
  }

  public hasScript(name: string) {
    return name in this.scripts;
  }

  public getExecutables(): { [key: string]: string } {
    const raw = this.json.bin;

    if (!raw) {
      return {};
    }

    if (typeof raw === 'string') {
      return {
        [this.name]: Path.resolve(this.path, raw),
      };
    }

    if (typeof raw === 'object') {
      const binsConfig: { [k: string]: string } = {};
      for (const binName of Object.keys(raw)) {
        binsConfig[binName] = Path.resolve(this.path, raw[binName]);
      }
      return binsConfig;
    }

    throw new CliError(
      `[${this.name}] has an invalid "bin" field in its package.json, ` +
        `expected an object or a string`,
      {
        binConfig: inspect(raw),
        package: `${this.name} (${this.packageJsonLocation})`,
      }
    );
  }

  public async runScript(scriptName: string, args: string[] = []) {
    log.info(`Running script [${scriptName}] in [${this.name}]:`);
    return runScriptInPackage(scriptName, args, this);
  }

  public runScriptStreaming(
    scriptName: string,
    options: { args?: string[]; debug?: boolean } = {}
  ) {
    return runScriptInPackageStreaming({
      script: scriptName,
      args: options.args || [],
      pkg: this,
      debug: options.debug,
    });
  }

  public hasDependencies() {
    return Object.keys(this.allDependencies).length > 0;
  }

  public isEveryDependencyLocal() {
    return Object.values(this.allDependencies).every((dep) => isLinkDependency(dep));
  }

  public async installDependencies({ extraArgs }: { extraArgs: string[] }) {
    log.info(`[${this.name}] running yarn`);

    log.write('');
    await installInDir(this.path, extraArgs);
    log.write('');
  }
}

// We normalize all path separators to `/` in generated files
function normalizePath(path: string) {
  return path.replace(/[\\\/]+/g, '/');
}
