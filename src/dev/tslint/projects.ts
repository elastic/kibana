import { readFileSync } from 'fs';
import { basename, dirname, relative, resolve } from 'path';

import { IMinimatch, Minimatch } from 'minimatch';
import { parseConfigFileTextToJson } from 'typescript';

import { File } from '../file';

const ROOT_DIR = resolve(__dirname, '../../../');

const PROJECT_PATHS = [
  require.resolve('../../../tsconfig.json'),
  require.resolve('../../../x-pack/tsconfig.json'),
  require.resolve('../../../packages/kbn-dev-utils/tsconfig.json'),
  require.resolve('../../../packages/kbn-pm/tsconfig.json'),
  require.resolve('../../../packages/kbn-system-loader/tsconfig.json'),
];

function makeMatchers(directory: string, patterns: string[]) {
  return patterns.map(
    pattern =>
      new Minimatch(resolve(directory, pattern), {
        dot: true,
      })
  );
}

function testMatchers(matchers: IMinimatch[], path: string) {
  return matchers.some(matcher => matcher.match(path));
}

export class Project {
  public static fromConfig(path: string) {
    const { error, config } = parseConfigFileTextToJson(
      path,
      readFileSync(path, 'utf8')
    );

    if (error) {
      throw error;
    }

    return new Project(
      path,
      dirname(path),
      config.files,
      config.include,
      config.exclude
    );
  }

  private include: IMinimatch[];
  private exclude: IMinimatch[];

  constructor(
    private tsConfigPath: string,
    private directory: string,
    files?: string[],
    include?: string[],
    exclude: string[] = []
  ) {
    if (files || !include) {
      throw new Error(
        'tsconfig.json files in the Kibana repo must use "include" keys and not "files"'
      );
    }

    this.include = makeMatchers(directory, include);
    this.exclude = makeMatchers(directory, exclude);
  }

  public getDirectory() {
    return this.directory;
  }

  public getName() {
    return relative(ROOT_DIR, this.directory) || basename(this.directory);
  }

  public getTsConfigPath() {
    return this.tsConfigPath;
  }

  public isFileSelected(file: File) {
    const path = file.getAbsolutePath();
    return testMatchers(this.exclude, path)
      ? false
      : testMatchers(this.include, path);
  }
}

export function getTsProjects() {
  return PROJECT_PATHS.map(Project.fromConfig);
}
