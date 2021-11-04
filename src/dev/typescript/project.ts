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
import { ProjectSet } from './project_set';

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

export interface ProjectOptions {
  name?: string;
  disableTypeCheck?: boolean;
}

interface LoadOptions {
  history?: string[];
  cache?: Map<string, Project>;
  skipConfigValidation?: boolean;
}

export class Project {
  static load(
    tsConfigPath: string,
    projectOptions?: ProjectOptions,
    loadOptions: LoadOptions = {}
  ): Project {
    const cache = loadOptions.cache ?? new Map<string, Project>();
    const cached = cache.get(tsConfigPath);
    if (cached) {
      return cached;
    }

    const config = parseTsConfig(tsConfigPath);

    if (!loadOptions?.skipConfigValidation) {
      if (config.files) {
        throw new Error(`${tsConfigPath} must not use "files" key`);
      }

      if (!config.include) {
        throw new Error(`${tsConfigPath} must have an "include" key`);
      }
    }

    const directory = Path.dirname(tsConfigPath);
    const disableTypeCheck = projectOptions?.disableTypeCheck || false;
    const name =
      projectOptions?.name || Path.relative(REPO_ROOT, directory) || Path.basename(directory);
    const includePatterns = config.include;
    const include = includePatterns ? makeMatchers(directory, includePatterns) : undefined;
    const excludePatterns = config.exclude;
    const exclude = excludePatterns ? makeMatchers(directory, excludePatterns) : undefined;

    let baseProject;
    if (config.extends) {
      const baseConfigPath = Path.resolve(directory, config.extends);

      // prevent circular deps
      if (loadOptions.history?.includes(baseConfigPath)) {
        throw new Error(
          `circular "extends" are not supported in tsconfig files: ${loadOptions.history} => ${baseConfigPath}`
        );
      }

      baseProject = Project.load(
        baseConfigPath,
        {},
        {
          skipConfigValidation: true,
          history: [...(loadOptions.history ?? []), tsConfigPath],
          cache,
        }
      );
    }

    const project = new Project(
      tsConfigPath,
      directory,
      name,
      config,
      disableTypeCheck,
      baseProject,
      include,
      includePatterns,
      exclude,
      excludePatterns
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
    private readonly includePatterns?: string[],
    private readonly exclude?: IMinimatch[],
    private readonly excludePatterns?: string[]
  ) {}

  public getIncludePatterns(): string[] {
    return this.includePatterns
      ? this.includePatterns
      : this.baseProject?.getIncludePatterns() ?? [];
  }
  public getExcludePatterns(): string[] {
    return this.excludePatterns
      ? this.excludePatterns
      : this.baseProject?.getExcludePatterns() ?? [];
  }

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

  public getProjectsDeep(cache?: Map<string, Project>) {
    const projects = new Set<Project>();
    const queue = new Set<string>([this.tsConfigPath]);

    for (const path of queue) {
      const project = Project.load(path, {}, { skipConfigValidation: true, cache });
      projects.add(project);
      for (const refPath of project.getRefdPaths()) {
        queue.add(refPath);
      }
    }

    return new ProjectSet(projects);
  }

  public getConfigPaths(): string[] {
    return this.baseProject
      ? [this.tsConfigPath, ...this.baseProject.getConfigPaths()]
      : [this.tsConfigPath];
  }
}
