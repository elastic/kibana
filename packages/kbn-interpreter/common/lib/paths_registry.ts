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

import { PathLike } from 'fs';

class PathsRegistry {
  private paths: Map<string, string[]>;

  constructor() {
    this.paths = new Map();
  }

  public register = (type: string, paths: PathLike | PathLike[]) => {
    if (!type) {
      throw new Error(`Register requires a type`);
    }
    const lowerCaseType = type.toLowerCase();

    const pathArray: PathLike[] = Array.isArray(paths) ? paths : [paths];
    if (!this.paths.has(lowerCaseType)) {
      this.paths.set(lowerCaseType, []);
    }

    pathArray.forEach(p => {
      this.paths.get(lowerCaseType)!.push(p);
    });
  };

  public registerAll = (paths: any) => {
    Object.keys(paths).forEach(type => {
      this.register(type, paths[type]);
    });
  };

  public toArray = () => {
    return [...this.paths.values()];
  };

  public get = (type: string): PathLike[] => {
    if (!type) {
      return [];
    }
    const lowerCaseType = type.toLowerCase();
    return this.paths.has(lowerCaseType) ? this.paths.get(lowerCaseType)! : [];
  };

  public reset = () => {
    this.paths.clear();
  };
}

export const pathsRegistry = new PathsRegistry();
