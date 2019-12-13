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

import { HttpSetup, HttpStart, HttpFetchOptions } from './types';
import { InjectedMetadataSetup } from '../injected_metadata';
import { FatalErrorsSetup } from '../fatal_errors';
import { BasePath } from './base_path';
import { AnonymousPaths } from './anonymous_paths';
import { LoadingCountService } from './loading_count_service';
import { Fetch } from './fetch';
import { CoreService } from '../../types';

interface HttpDeps {
  injectedMetadata: InjectedMetadataSetup;
  fatalErrors: FatalErrorsSetup;
}

/** @internal */
export class HttpService implements CoreService<HttpSetup, HttpStart> {
  private readonly loadingCount = new LoadingCountService();

  public setup({ injectedMetadata, fatalErrors }: HttpDeps): HttpSetup {
    const kibanaVersion = injectedMetadata.getKibanaVersion();
    const basePath = new BasePath(injectedMetadata.getBasePath());
    const anonymousPaths = new AnonymousPaths(basePath);
    const fetchService = new Fetch({ basePath, kibanaVersion });
    const loadingCount = this.loadingCount.setup({ fatalErrors });

    function shorthand(method: string) {
      return (path: string, options: HttpFetchOptions = {}) =>
        fetchService.fetch(path, { ...options, method });
    }

    return {
      basePath,
      anonymousPaths,
      intercept: fetchService.intercept.bind(fetchService),
      removeAllInterceptors: fetchService.removeAllInterceptors.bind(fetchService),
      fetch: fetchService.fetch.bind(fetchService),
      delete: shorthand('DELETE'),
      get: shorthand('GET'),
      head: shorthand('HEAD'),
      options: shorthand('OPTIONS'),
      patch: shorthand('PATCH'),
      post: shorthand('POST'),
      put: shorthand('PUT'),
      ...loadingCount,
    };
  }

  public start(deps: HttpDeps) {
    return this.setup(deps);
  }

  public stop() {
    this.loadingCount.stop();
  }
}
