import { readFileSync } from 'fs';
import { basename, dirname, relative, resolve } from 'path';
import globby from 'globby';

import { IMinimatch, Minimatch } from 'minimatch';
import { parseConfigFileTextToJson } from 'typescript';

import { File } from '../file';

const ROOT_DIR = resolve(__dirname, '../../../');

function makeMatchers(directory: string, patterns: string[]) {
  return patterns.map(pattern => new Minimatch(resolve(directory, pattern), {
    dot: true,
  }));
}

export class Project {
  public static fromConfig(path: string) {
    const { error, config } = parseConfigFileTextToJson(path, readFileSync(path, 'utf8'));

    if (error) {
      throw error;
    }

    return new Project(path, config.files, config.include, config.exclude);
  }

  private include: IMinimatch[];
  private exclude: IMinimatch[];

  constructor(private tsConfigPath: string, files?: string[], include?: string[], exclude: string[] = []) {
    if (files || !include) {
      throw new Error(
        'tsconfig.json files in the Kibana repo must use "include" keys and not "files"'
      );
    }

    this.include = makeMatchers(dirname(tsConfigPath), include);
    this.exclude = makeMatchers(dirname(tsConfigPath), exclude);
  }

  public getTsConfigPath() {
    return this.tsConfigPath;
  }

  public isAbsolutePathSelected(path: string) {
    return this.exclude.some(exc => exc.match(path))
      ? false
      : this.include.some(inc => inc.match(path));
  }
}

export const TS_PROJECTS = globby.sync([
  'packages/*/tsconfig.json',
  'tsconfig.json',
  'x-pack/tsconfig.json'
], {
  cwd: ROOT_DIR,
  absolute: true,
}).map(path => Project.fromConfig(path))

export function findProjectForAbsolutePath(path: string) {
  const project = TS_PROJECTS.find(p => p.isAbsolutePathSelected(path));

  if (!project) {
    throw new Error(
      `Unable to find tsconfig.json file selecting file "${path}". Ensure one exists and it is listed in "src/dev/typescript/projects.ts"`
    );
  }

  return project
}
