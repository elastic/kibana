/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { createStartServicesGetter } from '@kbn/kibana-utils-plugin/public';
import { fetchStreaming as fetchStreamingStatic, FetchStreamingParams } from './streaming';
import { DISABLE_BFETCH_COMPRESSION, removeLeadingSlash } from '../common';
import { createStreamingBatchedFunction, StreamingBatchedFunctionParams } from './batching';
import { BatchedFunc } from './batching/types';

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
    >
{
  private contract!: BfetchPublicContract;

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<any, any>,
    plugins: BfetchPublicSetupDependencies
  ): BfetchPublicSetup {
    const { version } = this.initializerContext.env.packageInfo;
    const basePath = core.http.basePath.get();

    const startServices = createStartServicesGetter(core.getStartServices);
    const getIsCompressionDisabled = () =>
      startServices().core.uiSettings.get<boolean>(DISABLE_BFETCH_COMPRESSION);

    const fetchStreaming = this.fetchStreaming(version, basePath, getIsCompressionDisabled);
    const batchedFunction = this.batchedFunction(fetchStreaming, getIsCompressionDisabled);

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

  private fetchStreaming =
    (
      version: string,
      basePath: string,
      getIsCompressionDisabled: () => boolean
    ): BfetchPublicSetup['fetchStreaming'] =>
    (params) =>
      fetchStreamingStatic({
        ...params,
        url: `${basePath}/${removeLeadingSlash(params.url)}`,
        headers: {
          'Content-Type': 'application/json',
          'kbn-version': version,
          ...(params.headers || {}),
        },
        getIsCompressionDisabled,
      });

  private batchedFunction =
    (
      fetchStreaming: BfetchPublicContract['fetchStreaming'],
      getIsCompressionDisabled: () => boolean
    ): BfetchPublicContract['batchedFunction'] =>
    (params) =>
      createStreamingBatchedFunction({
        ...params,
        getIsCompressionDisabled,
        fetchStreaming: params.fetchStreaming || fetchStreaming,
      });
}
