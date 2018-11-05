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

import { InjectedMetadataStartContract } from '../injected_metadata';
import { modifyUrl } from '../utils';

interface Deps {
  injectedMetadata: InjectedMetadataStartContract;
}

export class BasePathService {
  public start({ injectedMetadata }: Deps) {
    const basePath = injectedMetadata.getBasePath() || '';

    return {
      /**
       * Get the current basePath as defined by the server
       */
      get() {
        return basePath;
      },

      /**
       * Add the current basePath to a path string.
       * @param path A relative url including the leading `/`, otherwise it will be returned without modification
       */
      addToPath(path: string) {
        return modifyUrl(path, parts => {
          if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
            parts.pathname = `${basePath}${parts.pathname}`;
          }
        });
      },

      /**
       * Remove the basePath from a path that starts with it
       * @param path A relative url that starts with the basePath, which will be stripped
       */
      removeFromPath(path: string) {
        if (!basePath) {
          return path;
        }

        if (path === basePath) {
          return '/';
        }

        if (path.startsWith(basePath + '/')) {
          return path.slice(basePath.length);
        }

        return path;
      },
    };
  }
}

export type BasePathStartContract = ReturnType<BasePathService['start']>;
