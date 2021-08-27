/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { from, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import type { CoreSetup, CoreStart } from '../../../core/public';
import type { Plugin } from '../../../core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { DISABLE_BFETCH_COMPRESSION } from '../common/constants';
import { removeLeadingSlash } from '../common/util/remove_leading_slash';
import type { StreamingBatchedFunctionParams } from './batching/create_streaming_batched_function';
import { createStreamingBatchedFunction } from './batching/create_streaming_batched_function';
import type { BatchedFunc } from './batching/types';
import type { FetchStreamingParams } from './streaming/fetch_streaming';
import { fetchStreaming as fetchStreamingStatic } from './streaming/fetch_streaming';

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

  public setup(
    core: CoreSetup<any, any>,
    plugins: BfetchPublicSetupDependencies
  ): BfetchPublicSetup {
    const { version } = this.initializerContext.env.packageInfo;
    const basePath = core.http.basePath.get();

    const compressionDisabled$ = from(core.getStartServices()).pipe(
      switchMap((deps) => {
        return of(deps[0]);
      }),
      switchMap((coreStart) => {
        return coreStart.uiSettings.get$<boolean>(DISABLE_BFETCH_COMPRESSION);
      })
    );
    const fetchStreaming = this.fetchStreaming(version, basePath, compressionDisabled$);
    const batchedFunction = this.batchedFunction(fetchStreaming, compressionDisabled$);

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
    basePath: string,
    compressionDisabled$: Observable<boolean>
  ): BfetchPublicSetup['fetchStreaming'] => (params) =>
    fetchStreamingStatic({
      ...params,
      url: `${basePath}/${removeLeadingSlash(params.url)}`,
      headers: {
        'Content-Type': 'application/json',
        'kbn-version': version,
        ...(params.headers || {}),
      },
      compressionDisabled$,
    });

  private batchedFunction = (
    fetchStreaming: BfetchPublicContract['fetchStreaming'],
    compressionDisabled$: Observable<boolean>
  ): BfetchPublicContract['batchedFunction'] => (params) =>
    createStreamingBatchedFunction({
      ...params,
      compressionDisabled$,
      fetchStreaming: params.fetchStreaming || fetchStreaming,
    });
}
