import path from 'path';
import { inspect } from 'util';
import chalk from 'chalk';

import {
  installInDir,
  runScriptInPackage,
  runScriptInPackageStreaming,
} from './scripts';
import {
  PackageJson,
  PackageDependencies,
  PackageScripts,
  isLinkDependency,
  readPackageJson,
} from './package_json';
import { CliError } from './errors';

interface BuildConfig {
  skip?: boolean;
  intermediateBuildDirectory?: string;
}

export class Project {
  static async fromPath(path: string) {
    const pkgJson = await readPackageJson(path);
    return new Project(pkgJson, path);
  }

  public readonly json: PackageJson;
  public readonly packageJsonLocation: string;
  public readonly nodeModulesLocation: string;
  public readonly targetLocation: string;
  public readonly path: string;
  public readonly allDependencies: PackageDependencies;
  public readonly productionDependencies: PackageDependencies;
  public readonly devDependencies: PackageDependencies;
  public readonly scripts: PackageScripts;

  constructor(packageJson: PackageJson, projectPath: string) {
    this.json = Object.freeze(packageJson);
    this.path = projectPath;

    this.packageJsonLocation = path.resolve(this.path, 'package.json');
    this.nodeModulesLocation = path.resolve(this.path, 'node_modules');
    this.targetLocation = path.resolve(this.path, 'target');

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

  ensureValidProjectDependency(project: Project) {
    const relativePathToProject = normalizePath(
      path.relative(this.path, project.path)
    );

    const versionInPackageJson = this.allDependencies[project.name];
    const expectedVersionInPackageJson = `link:${relativePathToProject}`;

    if (versionInPackageJson === expectedVersionInPackageJson) {
      return;
    }

    const updateMsg = 'Update its package.json to the expected value below.';
    const meta = {
      package: `${this.name} (${this.packageJsonLocation})`,
      expected: `"${project.name}": "${expectedVersionInPackageJson}"`,
      actual: `"${project.name}": "${versionInPackageJson}"`,
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

  getBuildConfig(): BuildConfig {
    return (this.json.kibana && this.json.kibana.build) || {};
  }

  /**
   * Returns the directory that should be copied into the Kibana build artifact.
   * This config can be specified to only include the project's build artifacts
   * instead of everything located in the project directory.
   */
  getIntermediateBuildDirectory() {
    return path.resolve(
      this.path,
      this.getBuildConfig().intermediateBuildDirectory || '.'
    );
  }

  hasScript(name: string) {
    return name in this.scripts;
  }

  getExecutables(): { [key: string]: string } {
    const raw = this.json.bin;

    if (!raw) {
      return {};
    }

    if (typeof raw === 'string') {
      return {
        [this.name]: path.resolve(this.path, raw),
      };
    }

    if (typeof raw === 'object') {
      const binsConfig: { [k: string]: string } = {};
      for (const binName of Object.keys(raw)) {
        binsConfig[binName] = path.resolve(this.path, raw[binName]);
      }
      return binsConfig;
    }

    throw new CliError(
      `[${this.name}] has an invalid "bin" field in its package.json, ` +
        `expected an object or a string`,
      {
        package: `${this.name} (${this.packageJsonLocation})`,
        binConfig: inspect(raw),
      }
    );
  }

  async runScript(scriptName: string, args: string[] = []) {
    console.log(
      chalk.bold(
        `\n\nRunning script [${chalk.green(scriptName)}] in [${chalk.green(
          this.name
        )}]:\n`
      )
    );
    return runScriptInPackage(scriptName, args, this);
  }

  runScriptStreaming(scriptName: string, args: string[] = []) {
    return runScriptInPackageStreaming(scriptName, args, this);
  }

  hasDependencies() {
    return Object.keys(this.allDependencies).length > 0;
  }

  async installDependencies({ extraArgs }: { extraArgs: string[] }) {
    console.log(
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
