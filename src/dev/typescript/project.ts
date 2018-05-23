import { readFileSync } from 'fs';
import { basename, dirname, relative, resolve } from 'path';

import { IMinimatch, Minimatch } from 'minimatch';
import { parseConfigFileTextToJson } from 'typescript';

import { REPO_ROOT } from '../constants';

function makeMatchers(directory: string, patterns: string[]) {
  return patterns.map(
    pattern =>
      new Minimatch(resolve(directory, pattern), {
        dot: true,
      })
  );
}

function parseTsConfig(path: string) {
  const { error, config } = parseConfigFileTextToJson(
    path,
    readFileSync(path, 'utf8')
  );

  if (error) {
    throw error;
  }

  const files: string[] | undefined = config.files;
  const include: string[] | undefined = config.include;
  const exclude: string[] | undefined = config.exclude;
  return { files, include, exclude };
}

function testMatchers(matchers: IMinimatch[], path: string) {
  return matchers.some(matcher => matcher.match(path));
}

export class Project {
  public directory: string;
  public name: string;
  private include: IMinimatch[];
  private exclude: IMinimatch[];

  constructor(public tsConfigPath: string) {
    const { files, include, exclude = [] } = parseTsConfig(tsConfigPath);

    if (files || !include) {
      throw new Error(
        'tsconfig.json files in the Kibana repo must use "include" keys and not "files"'
      );
    }

    this.directory = dirname(this.tsConfigPath);
    this.name = relative(REPO_ROOT, this.directory) || basename(this.directory);
    this.include = makeMatchers(this.directory, include);
    this.exclude = makeMatchers(this.directory, exclude);
  }

  public isAbsolutePathSelected(path: string) {
    return testMatchers(this.exclude, path)
      ? false
      : testMatchers(this.include, path);
  }
}
