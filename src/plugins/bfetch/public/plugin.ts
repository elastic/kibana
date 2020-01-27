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

import { CoreStart, PluginInitializerContext, CoreSetup, Plugin } from 'src/core/public';
import { fetchStreaming as fetchStreamingStatic, FetchStreamingParams } from './streaming';
import { removeLeadingSlash } from '../common';

// eslint-disable-next-line
export interface BfetchPublicSetupDependencies {}

// eslint-disable-next-line
export interface BfetchPublicStartDependencies {}

export interface BfetchPublicApi {
  fetchStreaming: (params: FetchStreamingParams) => ReturnType<typeof fetchStreamingStatic>;
}

export type BfetchPublicSetup = BfetchPublicApi;
export type BfetchPublicStart = BfetchPublicApi;

export class BfetchPublicPlugin
  implements
    Plugin<
      BfetchPublicSetup,
      BfetchPublicStart,
      BfetchPublicSetupDependencies,
      BfetchPublicStartDependencies
    > {
  private api!: BfetchPublicApi;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: BfetchPublicSetupDependencies): BfetchPublicSetup {
    const { version } = this.initializerContext.env.packageInfo;
    const basePath = core.http.basePath.get();

    const fetchStreaming = this.fetchStreaming(version, basePath);

    this.api = {
      fetchStreaming,
    };

    return this.api;
  }

  public start(core: CoreStart, plugins: BfetchPublicStartDependencies): BfetchPublicStart {
    return this.api;
  }

  public stop() {}

  private fetchStreaming = (
    version: string,
    basePath: string
  ): BfetchPublicSetup['fetchStreaming'] => params =>
    fetchStreamingStatic({
      ...params,
      url: `${basePath}/${removeLeadingSlash(params.url)}`,
      headers: {
        'Content-Type': 'application/json',
        'kbn-version': version,
        ...(params.headers || {}),
      },
    });
}
