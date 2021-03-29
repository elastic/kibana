/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { basename, dirname, relative, resolve } from 'path';
import { memoize } from 'lodash';
import { IMinimatch, Minimatch } from 'minimatch';
import { REPO_ROOT } from '@kbn/utils';

import { parseTsConfig } from './ts_configfile';

function makeMatchers(directory: string, patterns: string[]) {
  return patterns.map(
    (pattern) =>
      new Minimatch(resolve(directory, pattern), {
        dot: true,
      })
  );
}

function testMatchers(matchers: IMinimatch[], path: string) {
  return matchers.some((matcher) => matcher.match(path));
}

const parentProjectFactory = memoize(function (parentConfigPath: string) {
  return new Project(parentConfigPath);
});

export class Project {
  public directory: string;
  public name: string;
  public config: any;
  public disableTypeCheck: boolean;

  private readonly include: IMinimatch[];
  private readonly exclude: IMinimatch[];
  private readonly parent?: Project;

  constructor(
    public tsConfigPath: string,
    options: { name?: string; disableTypeCheck?: boolean } = {}
  ) {
    this.config = parseTsConfig(tsConfigPath);

    const { files, include, exclude = [], extends: extendsPath } = this.config as {
      files?: string[];
      include?: string[];
      exclude?: string[];
      extends?: string;
    };

    if (files || !include) {
      throw new Error(
        `[${tsConfigPath}]: tsconfig.json files in the Kibana repo must use "include" keys and not "files"`
      );
    }

    this.directory = dirname(this.tsConfigPath);
    this.disableTypeCheck = options.disableTypeCheck || false;
    this.name = options.name || relative(REPO_ROOT, this.directory) || basename(this.directory);
    this.include = makeMatchers(this.directory, include);
    this.exclude = makeMatchers(this.directory, exclude);

    if (extendsPath !== undefined) {
      const parentConfigPath = resolve(this.directory, extendsPath);
      this.parent = parentProjectFactory(parentConfigPath);
    }
  }

  public isAbsolutePathSelected(path: string): boolean {
    return this.isExcluded(path) ? false : this.isIncluded(path);
  }

  public isExcluded(path: string): boolean {
    if (testMatchers(this.exclude, path)) return true;
    if (this.parent) {
      return this.parent.isExcluded(path);
    }
    return false;
  }

  public isIncluded(path: string): boolean {
    if (testMatchers(this.include, path)) return true;
    if (this.parent) {
      return this.parent.isIncluded(path);
    }
    return false;
  }
}
