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

import { InjectedMetadataSetup } from '../injected_metadata';
import { modifyUrl } from '../utils';

interface BasePathDeps {
  injectedMetadata: InjectedMetadataSetup;
}

/** @internal */
export class BasePathService {
  public setup({ injectedMetadata }: BasePathDeps) {
    return new BasePathSetup(injectedMetadata.getBasePath() || '');
  }
}

/**
 * Provides access the 'server.basePath' configuration option in kibana.yml
 *
 * @public
 */
export class BasePathSetup {
  /**
   * Don't use this constructor directly, use an instance of this class
   * provided by CoreSetup instead.
   *
   * @param basePath - The basePath as specificied by the server
   *
   * @internal
   */
  constructor(private readonly basePath: string) {}

  /**
   * Get the basePath as defined by the server
   *
   * @returns The basePath as defined by the server
   */
  public get(): string {
    return this.basePath;
  }

  /**
   * Add the current basePath to a path string.
   *
   * @param path - A relative url including the leading `/`, otherwise it will be returned without modification
   */
  public addToPath(path: string): string {
    return modifyUrl(path, parts => {
      if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
        parts.pathname = `${this.basePath}${parts.pathname}`;
      }
    });
  }

  /**
   * Remove the basePath from a path that starts with it
   *
   * @param path - A relative url that starts with the basePath, which will be stripped
   */
  public removeFromPath(path: string): string {
    if (!this.basePath) {
      return path;
    }

    if (path === this.basePath) {
      return '/';
    }

    if (path.startsWith(this.basePath + '/')) {
      return path.slice(this.basePath.length);
    }

    return path;
  }
}
