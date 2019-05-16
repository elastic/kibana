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
/* eslint-disable max-classes-per-file */

import { InjectedMetadataSetup, InjectedMetadataStart } from '../injected_metadata';
import { modifyUrl } from '../utils';

/**
 * Provides access to the 'server.basePath' configuration option in kibana.yml
 *
 * @public
 */
export interface BasePathSetup {
  /**
   * Get the basePath as defined by the server
   *
   * @returns The basePath as defined by the server
   */
  get(): string;

  /**
   * Add the current basePath to a path string.
   *
   * @param path - A relative url including the leading `/`, otherwise it will be returned without modification
   */
  addToPath(path: string): string;

  /**
   * Removes basePath from the given path if the path starts with it
   *
   * @param path - A relative url that starts with the basePath, which will be stripped
   */
  removeFromPath(path: string): string;
}

/**
 * Provides access to the 'server.basePath' configuration option in kibana.yml
 *
 * @public
 */
export type BasePathStart = BasePathSetup;

interface SetupDeps {
  injectedMetadata: InjectedMetadataSetup;
}

interface StartDeps {
  injectedMetadata: InjectedMetadataStart;
}

/** @internal */
export class BasePathService {
  public setup({ injectedMetadata }: SetupDeps) {
    const basePath = injectedMetadata.getBasePath() || '';

    const basePathSetup: BasePathSetup = {
      get: () => basePath,
      addToPath: path => {
        return modifyUrl(path, parts => {
          if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
            parts.pathname = `${basePath}${parts.pathname}`;
          }
        });
      },
      removeFromPath(path: string): string {
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

    return basePathSetup;
  }

  public start({ injectedMetadata }: StartDeps) {
    return this.setup({ injectedMetadata });
  }
}
