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
import { relative, resolve as resolvePath } from 'path';
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
} from './scripts';

interface IBuildConfig {
  skip?: boolean;
  intermediateBuildDirectory?: string;
}

export class Project {
  public static async fromPath(path: string) {
    const pkgJson = await readPackageJson(path);
    return new Project(pkgJson, path);
  }

  public readonly json: IPackageJson;
  public readonly packageJsonLocation: string;
  public readonly nodeModulesLocation: string;
  public readonly targetLocation: string;
  public readonly path: string;
  public readonly allDependencies: IPackageDependencies;
  public readonly productionDependencies: IPackageDependencies;
  public readonly devDependencies: IPackageDependencies;
  public readonly scripts: IPackageScripts;

  constructor(packageJson: IPackageJson, projectPath: string) {
    this.json = Object.freeze(packageJson);
    this.path = projectPath;

    this.packageJsonLocation = resolvePath(this.path, 'package.json');
    this.nodeModulesLocation = resolvePath(this.path, 'node_modules');
    this.targetLocation = resolvePath(this.path, 'target');

    this.productionDependencies = this.json.dependencies || {};
    this.devDependencies = this.json.devDependencies || {};
    this.allDependencies = {
      ...this.devDependencies,
      ...this.productionDependencies,
    };

    this.scripts = this.json.scripts || {};
  }

  get name(): string {
    return this.json.name;
  }

  public ensureValidProjectDependency(project: Project) {
    const relativePathToProject = normalizePath(
      relative(this.path, project.path)
    );

    const versionInPackageJson = this.allDependencies[project.name];
    const expectedVersionInPackageJson = `link:${relativePathToProject}`;

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
        `[${this.name}] depends on [${
          project.name
        }] using 'link:', but the path is wrong. ${updateMsg}`,
        meta
      );
    }

    throw new CliError(
      `[${this.name}] depends on [${
        project.name
      }], but it's not using the local package. ${updateMsg}`,
      meta
    );
  }

  public getBuildConfig(): IBuildConfig {
    return (this.json.kibana && this.json.kibana.build) || {};
  }

  /**
   * Returns the directory that should be copied into the Kibana build artifact.
   * This config can be specified to only include the project's build artifacts
   * instead of everything located in the project directory.
   */
  public getIntermediateBuildDirectory() {
    return resolvePath(
      this.path,
      this.getBuildConfig().intermediateBuildDirectory || '.'
    );
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
        [this.name]: resolvePath(this.path, raw),
      };
    }

    if (typeof raw === 'object') {
      const binsConfig: { [k: string]: string } = {};
      for (const binName of Object.keys(raw)) {
        binsConfig[binName] = resolvePath(this.path, raw[binName]);
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
        `\n\nRunning script [${chalk.green(scriptName)}] in [${chalk.green(
          this.name
        )}]:\n`
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
    log.write(
      chalk.bold(
        `\n\nInstalling dependencies in [${chalk.green(this.name)}]:\n`
      )
    );
    return installInDir(this.path, extraArgs);
  }
}

// We normalize all path separators to `/` in generated files
function normalizePath(path: string) {
  return path.replace(/[\\\/]+/g, '/');
}
