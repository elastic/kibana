/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { readFileSync } from 'fs';
import { basename, dirname, relative, resolve } from 'path';

import { IMinimatch, Minimatch } from 'minimatch';
import { parseConfigFileTextToJson } from 'typescript';

import { REPO_ROOT } from '@kbn/utils';

function makeMatchers(directory: string, patterns: string[]) {
  return patterns.map(
    (pattern) =>
      new Minimatch(resolve(directory, pattern), {
        dot: true,
      })
  );
}

function parseTsConfig(path: string) {
  const { error, config } = parseConfigFileTextToJson(path, readFileSync(path, 'utf8'));

  if (error) {
    throw error;
  }

  return config;
}

function testMatchers(matchers: IMinimatch[], path: string) {
  return matchers.some((matcher) => matcher.match(path));
}

export class Project {
  public directory: string;
  public name: string;
  public config: any;
  public disableTypeCheck: boolean;

  private readonly include: IMinimatch[];
  private readonly exclude: IMinimatch[];

  constructor(
    public tsConfigPath: string,
    options: { name?: string; disableTypeCheck?: boolean } = {}
  ) {
    this.config = parseTsConfig(tsConfigPath);

    const { files, include, exclude = [] } = this.config as {
      files?: string[];
      include?: string[];
      exclude?: string[];
    };

    if (files || !include) {
      throw new Error(
        'tsconfig.json files in the Kibana repo must use "include" keys and not "files"'
      );
    }

    this.directory = dirname(this.tsConfigPath);
    this.disableTypeCheck = options.disableTypeCheck || false;
    this.name = options.name || relative(REPO_ROOT, this.directory) || basename(this.directory);
    this.include = makeMatchers(this.directory, include);
    this.exclude = makeMatchers(this.directory, exclude);
  }

  public isAbsolutePathSelected(path: string) {
    return testMatchers(this.exclude, path) ? false : testMatchers(this.include, path);
  }
}
