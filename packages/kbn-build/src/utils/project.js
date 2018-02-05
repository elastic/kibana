import path from 'path';
import chalk from 'chalk';

import {
  installInDir,
  runScriptInPackage,
  runScriptInPackageStreaming,
} from './scripts';
import { readPackageJson } from './package_json';
import { CliError } from './errors';

const PREFIX = 'link:';

export class Project {
  static async fromPath(path) {
    const pkgJson = await readPackageJson(path);
    return new Project(pkgJson, path);
  }

  constructor(packageJson, projectPath) {
    this.json = Object.freeze(packageJson);
    this.path = projectPath;

    this.packageJsonLocation = path.resolve(this.path, 'package.json');
    this.nodeModulesLocation = path.resolve(this.path, 'node_modules');
    this.targetLocation = path.resolve(this.path, 'target');

    this.allDependencies = {
      ...(this.json.devDependencies || {}),
      ...(this.json.dependencies || {}),
    };

    this.scripts = this.json.scripts || {};
  }

  get name() {
    return this.json.name;
  }

  ensureValidProjectDependency(project) {
    const relativePathToProject = normalizePath(
      path.relative(this.path, project.path)
    );

    const versionInPackageJson = this.allDependencies[project.name];
    const expectedVersionInPackageJson = `${PREFIX}${relativePathToProject}`;

    if (versionInPackageJson === expectedVersionInPackageJson) {
      return;
    }

    const updateMsg = 'Update its package.json to the expected value below.';
    const meta = {
      package: `${this.name} (${this.packageJsonLocation})`,
      expected: `"${project.name}": "${expectedVersionInPackageJson}"`,
      actual: `"${project.name}": "${versionInPackageJson}"`,
    };

    if (versionInPackageJson.startsWith(PREFIX)) {
      throw new CliError(
        `[${this.name}] depends on [${
          project.name
        }] using '${PREFIX}', but the path is wrong. ${updateMsg}`,
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

  skipFromBuild() {
    const json = this.json;
    return json.kibana && json.kibana.build && json.kibana.build.skip === true;
  }

  hasScript(name) {
    return name in this.scripts;
  }

  async runScript(scriptName, args = []) {
    console.log(
      chalk.bold(
        `\n\nRunning script [${chalk.green(scriptName)}] in [${chalk.green(
          this.name
        )}]:\n`
      )
    );
    return runScriptInPackage(scriptName, args, this);
  }

  async runScriptStreaming(scriptName, args = []) {
    return runScriptInPackageStreaming(scriptName, args, this);
  }

  hasDependencies() {
    return Object.keys(this.allDependencies).length > 0;
  }

  async installDependencies({ extraArgs }) {
    console.log(
      chalk.bold(
        `\n\nInstalling dependencies in [${chalk.green(this.name)}]:\n`
      )
    );
    return installInDir(this.path, extraArgs);
  }
}

// We normalize all path separators to `/` in generated files
function normalizePath(path) {
  return path.replace(/[\\\/]+/g, '/');
}
