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

import { IAnonymousPaths, IBasePath } from 'src/core/public';
import { CoreService } from '../../types';

interface Deps {
  basePath: IBasePath;
}

export class AnonymousPathsService implements CoreService<IAnonymousPaths, IAnonymousPaths> {
  private readonly paths = new Set<string>();

  public setup({ basePath }: Deps) {
    return {
      isAnonymous: (path: string): boolean => {
        const pathWithoutBasePath = basePath.remove(path);
        return this.paths.has(normalizePath(pathWithoutBasePath));
      },

      register: (path: string) => {
        this.paths.add(normalizePath(path));
      },

      normalizePath,
    };
  }

  public start(deps: Deps) {
    return this.setup(deps);
  }

  public stop() {}
}

const normalizePath = (path: string) => {
  // always lower-case it
  let normalized = path.toLowerCase();

  // remove the slash from the end
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, normalized.length - 1);
  }

  // put a slash at the start
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  // it's normalized!!!
  return normalized;
};
