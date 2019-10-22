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

import { HttpSetup } from './types';

export class AnonymousPaths {
  private readonly paths = new Set<string>();

  constructor(private basePath: HttpSetup['basePath']) {
    this.paths = new Set();
  }

  public isAnonymous(path: string): boolean {
    const pathWithoutBasePath = this.basePath.remove(path);
    return this.paths.has(this.normalizePath(pathWithoutBasePath));
  }

  public register(path: string) {
    if (!path.startsWith('/')) {
      throw new Error('"path" must start with "/"');
    }

    this.paths.add(this.normalizePath(path));
  }

  private normalizePath(path: string) {
    const lowercased = path.toLowerCase();

    if (lowercased.endsWith('/')) {
      return lowercased.slice(0, lowercased.length - 1);
    }

    return lowercased;
  }
}
