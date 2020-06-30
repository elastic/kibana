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
import {
  createStreamingBatchedFunction,
  BatchedFunc,
  StreamingBatchedFunctionParams,
} from './batching/create_streaming_batched_function';

// eslint-disable-next-line
export interface BfetchPublicSetupDependencies {}

// eslint-disable-next-line
export interface BfetchPublicStartDependencies {}

export interface BfetchPublicContract {
  fetchStreaming: (params: FetchStreamingParams) => ReturnType<typeof fetchStreamingStatic>;
  batchedFunction: <Payload, Result extends object>(
    params: StreamingBatchedFunctionParams<Payload, Result>
  ) => BatchedFunc<Payload, Result>;
}

export type BfetchPublicSetup = BfetchPublicContract;
export type BfetchPublicStart = BfetchPublicContract;

export class BfetchPublicPlugin
  implements
    Plugin<
      BfetchPublicSetup,
      BfetchPublicStart,
      BfetchPublicSetupDependencies,
      BfetchPublicStartDependencies
    > {
  private contract!: BfetchPublicContract;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: BfetchPublicSetupDependencies): BfetchPublicSetup {
    const { version } = this.initializerContext.env.packageInfo;
    const basePath = core.http.basePath.get();

    const fetchStreaming = this.fetchStreaming(version, basePath);
    const batchedFunction = this.batchedFunction(fetchStreaming);

    this.contract = {
      fetchStreaming,
      batchedFunction,
    };

    return this.contract;
  }

  public start(core: CoreStart, plugins: BfetchPublicStartDependencies): BfetchPublicStart {
    return this.contract;
  }

  public stop() {}

  private fetchStreaming = (
    version: string,
    basePath: string
  ): BfetchPublicSetup['fetchStreaming'] => (params) =>
    fetchStreamingStatic({
      ...params,
      url: `${basePath}/${removeLeadingSlash(params.url)}`,
      headers: {
        'Content-Type': 'application/json',
        'kbn-version': version,
        ...(params.headers || {}),
      },
    });

  private batchedFunction = (
    fetchStreaming: BfetchPublicContract['fetchStreaming']
  ): BfetchPublicContract['batchedFunction'] => (params) =>
    createStreamingBatchedFunction({
      ...params,
      fetchStreaming: params.fetchStreaming || fetchStreaming,
    });
}
