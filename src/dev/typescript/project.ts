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
  const { error, config } = parseConfigFileTextToJson(path, readFileSync(path, 'utf8'));

  if (error) {
    throw error;
  }

  return config;
}

function testMatchers(matchers: IMinimatch[], path: string) {
  return matchers.some(matcher => matcher.match(path));
}

export class Project {
  public directory: string;
  public name: string;
  public config: any;

  private readonly include: IMinimatch[];
  private readonly exclude: IMinimatch[];

  constructor(public tsConfigPath: string, name?: string) {
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
    this.name = name || relative(REPO_ROOT, this.directory) || basename(this.directory);
    this.include = makeMatchers(this.directory, include);
    this.exclude = makeMatchers(this.directory, exclude);
  }

  public isAbsolutePathSelected(path: string) {
    return testMatchers(this.exclude, path) ? false : testMatchers(this.include, path);
  }
}
