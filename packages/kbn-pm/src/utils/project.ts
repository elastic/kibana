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
import fs from 'fs';
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
import {
  installInDir,
  runScriptInPackage,
  runScriptInPackageStreaming,
  yarnWorkspacesInfo,
} from './scripts';

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

  public isWorkspaceRoot = false;
  public isWorkspaceProject = false;

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
    this.isWorkspaceRoot = this.json.hasOwnProperty('workspaces');

    this.scripts = this.json.scripts || {};
  }

  public get name(): string {
    return this.json.name;
  }

  public ensureValidProjectDependency(project: Project, dependentProjectIsInWorkspace: boolean) {
    const versionInPackageJson = this.allDependencies[project.name];

    let expectedVersionInPackageJson;
    if (dependentProjectIsInWorkspace) {
      expectedVersionInPackageJson = project.json.version;
    } else {
      const relativePathToProject = normalizePath(Path.relative(this.path, project.path));
      expectedVersionInPackageJson = `link:${relativePathToProject}`;
    }

    // No issues!
    if (versionInPackageJson === expectedVersionInPackageJson) {
      return;
    }

    let problemMsg;
    if (isLinkDependency(versionInPackageJson) && dependentProjectIsInWorkspace) {
      problemMsg = `but should be using a workspace`;
    } else if (isLinkDependency(versionInPackageJson)) {
      problemMsg = `using 'link:', but the path is wrong`;
    } else {
      problemMsg = `but it's not using the local package`;
    }

    throw new CliError(
      `[${this.name}] depends on [${project.name}] ${problemMsg}. Update its package.json to the expected value below.`,
      {
        actual: `"${project.name}": "${versionInPackageJson}"`,
        expected: `"${project.name}": "${expectedVersionInPackageJson}"`,
        package: `${this.name} (${this.packageJsonLocation})`,
      }
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
    log.write(
      chalk.bold(
        `\n\nRunning script [${chalk.green(scriptName)}] in [${chalk.green(this.name)}]:\n`
      )
    );
    return runScriptInPackage(scriptName, args, this);
  }

  public runScriptStreaming(scriptName: string, args: string[] = []) {
    return runScriptInPackageStreaming(scriptName, args, this);
  }

  public hasDependencies() {
    return Object.keys(this.allDependencies).length > 0;
  }

  public async installDependencies({ extraArgs }: { extraArgs: string[] }) {
    log.write(chalk.bold(`\n\nInstalling dependencies in [${chalk.green(this.name)}]:\n`));
    await installInDir(this.path, extraArgs);
    await this.removeExtraneousNodeModules();
  }

  /**
   * Yarn workspaces symlinks workspace projects to the root node_modules, even
   * when there is no depenency on the project. This results in unnecicary, and
   * often duplicated code in the build archives.
   */
  public async removeExtraneousNodeModules() {
    // this is only relevant for the root workspace
    if (!this.isWorkspaceRoot) {
      return;
    }

    const workspacesInfo = await yarnWorkspacesInfo(this.path);
    const unusedWorkspaces = new Set(Object.keys(workspacesInfo));

    // check for any cross-project dependency
    for (const name of Object.keys(workspacesInfo)) {
      const workspace = workspacesInfo[name];
      workspace.workspaceDependencies.forEach(w => unusedWorkspaces.delete(w));
    }

    unusedWorkspaces.forEach(name => {
      const { dependencies, devDependencies } = this.json;
      const nodeModulesPath = Path.resolve(this.nodeModulesLocation, name);
      const isDependency = dependencies && dependencies.hasOwnProperty(name);
      const isDevDependency = devDependencies && devDependencies.hasOwnProperty(name);

      if (!isDependency && !isDevDependency && fs.existsSync(nodeModulesPath)) {
        log.write(`No dependency on ${name}, removing link in node_modules`);
        fs.unlinkSync(nodeModulesPath);
      }
    });
  }
}

// We normalize all path separators to `/` in generated files
function normalizePath(path: string) {
  return path.replace(/[\\\/]+/g, '/');
}
