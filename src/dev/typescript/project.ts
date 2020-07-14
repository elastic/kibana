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

import { readFileSync } from 'fs';
import { basename, dirname, relative, resolve } from 'path';

import { IMinimatch, Minimatch } from 'minimatch';
import { parseConfigFileTextToJson } from 'typescript';
import deepMerge from 'deepmerge';

import { REPO_ROOT } from '../constants';

function makeMatchers(directory: string, patterns: string[]) {
  return patterns.map(
    (pattern) =>
      new Minimatch(resolve(directory, pattern), {
        dot: true,
      })
  );
}

function parseTsConfig(path: string) {
  // eslint-disable-next-line prefer-const
  let { error, config } = parseConfigFileTextToJson(path, readFileSync(path, 'utf8'));
  if (config.extends) {
    const extendsPath = resolve(dirname(path), config.extends);
    const extendSource = parseTsConfig(extendsPath);
    // This is a really rough approximation of Typescript's `extends`
    // behaviour and doesn't correctly include all files. But I couldn't find
    // a public API to read a fully extend config. Seems like
    // `getParsedCommandLine` might be what we want but unsure how to use it?
    config = deepMerge(config, extendSource);
  }

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
  public disableNoEmit: boolean;

  private readonly include: IMinimatch[];
  private readonly exclude: IMinimatch[];

  constructor(
    public tsConfigPath: string,
    options: { name?: string; disableTypeCheck?: boolean; disableNoEmit?: boolean } = {}
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
    this.disableNoEmit = options.disableNoEmit || false;
    this.name = options.name || relative(REPO_ROOT, this.directory) || basename(this.directory);
    this.include = makeMatchers(this.directory, include);
    this.exclude = makeMatchers(this.directory, exclude);
  }

  public isAbsolutePathSelected(path: string) {
    return testMatchers(this.exclude, path) ? false : testMatchers(this.include, path);
  }
}
