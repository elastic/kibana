/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { IMinimatch, Minimatch } from 'minimatch';
import { REPO_ROOT } from '@kbn/utils';

import { parseTsConfig } from './ts_configfile';

function makeMatchers(directory: string, patterns: string[]) {
  return patterns.map(
    (pattern) =>
      new Minimatch(Path.resolve(directory, pattern), {
        dot: true,
      })
  );
}

function testMatchers(matchers: IMinimatch[], path: string) {
  return matchers.some((matcher) => matcher.match(path));
}

interface Options {
  name?: string;
  disableTypeCheck?: boolean;
  skipConfigValidation?: boolean;

  _loadingPath?: string[];
  _cache?: Map<string, Project>;
}
export class Project {
  static at(tsConfigPath: string, options: Options = {}): Project {
    const cache = options._cache ?? new Map<string, Project>();
    const cached = cache.get(tsConfigPath);
    if (cached) {
      return cached;
    }

    const config = parseTsConfig(tsConfigPath);

    if (!options?.skipConfigValidation) {
      if (config.files) {
        throw new Error(`${tsConfigPath} must not use "files" key`);
      }

      if (!config.include) {
        throw new Error(`${tsConfigPath} must have an "include" key`);
      }
    }

    const directory = Path.dirname(tsConfigPath);
    const disableTypeCheck = options?.disableTypeCheck || false;
    const name = options?.name || Path.relative(REPO_ROOT, directory) || Path.basename(directory);
    const include = config.include ? makeMatchers(directory, config.include) : undefined;
    const exclude = config.exclude ? makeMatchers(directory, config.exclude) : undefined;

    let baseProject;
    if (config.extends) {
      const baseConfigPath = Path.resolve(directory, config.extends);

      // prevent circular deps
      if (options._loadingPath?.includes(baseConfigPath)) {
        throw new Error(
          `circular "extends" are not supported in tsconfig files: ${options._loadingPath} => ${baseConfigPath}`
        );
      }

      baseProject = Project.at(baseConfigPath, {
        skipConfigValidation: true,
        _loadingPath: [...(options._loadingPath ?? []), tsConfigPath],
        _cache: cache,
      });
    }

    const project = new Project(
      tsConfigPath,
      directory,
      name,
      config,
      disableTypeCheck,
      baseProject,
      include,
      exclude
    );
    cache.set(tsConfigPath, project);
    return project;
  }

  constructor(
    public readonly tsConfigPath: string,
    public readonly directory: string,
    public readonly name: string,
    public readonly config: any,
    public readonly disableTypeCheck: boolean,

    public readonly baseProject?: Project,
    private readonly include?: IMinimatch[],
    private readonly exclude?: IMinimatch[]
  ) {}

  private getInclude(): IMinimatch[] {
    return this.include ? this.include : this.baseProject?.getInclude() ?? [];
  }

  private getExclude(): IMinimatch[] {
    return this.exclude ? this.exclude : this.baseProject?.getExclude() ?? [];
  }

  public isAbsolutePathSelected(path: string) {
    return testMatchers(this.getExclude(), path) ? false : testMatchers(this.getInclude(), path);
  }

  public isCompositeProject(): boolean {
    const own = this.config.compilerOptions?.composite;
    return !!(own === undefined ? this.baseProject?.isCompositeProject() : own);
  }

  public getOutDir(): string | undefined {
    if (this.config.compilerOptions?.outDir) {
      return Path.resolve(this.directory, this.config.compilerOptions.outDir);
    }
    if (this.baseProject) {
      return this.baseProject.getOutDir();
    }
    return undefined;
  }

  public getRefdPaths(): string[] {
    if (this.config.references) {
      return (this.config.references as Array<{ path: string }>).map(({ path }) =>
        Path.resolve(this.directory, path)
      );
    }

    return this.baseProject ? this.baseProject.getRefdPaths() : [];
  }

  public getOutDirsDeep(): string[] {
    const cache = new Map<string, Project>();
    const outDirs = new Set<string>();
    const queue = new Set<string>([this.tsConfigPath]);

    for (const path of queue) {
      const project =
        path === this.tsConfigPath
          ? this
          : Project.at(path, { skipConfigValidation: true, _cache: cache });

      const outDir = project.getOutDir();
      if (outDir) {
        outDirs.add(outDir);
      }
      for (const refPath of project.getRefdPaths()) {
        queue.add(refPath);
      }
    }

    return [...outDirs];
  }

  public getConfigPaths(): string[] {
    return this.baseProject
      ? [this.tsConfigPath, ...this.baseProject.getConfigPaths()]
      : [this.tsConfigPath];
  }
}
