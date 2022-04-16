/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  CoreStart,
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  Logger,
  KibanaRequest,
  StartServicesAccessor,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { map$ } from '@kbn/std';
import {
  StreamingResponseHandler,
  BatchRequestData,
  BatchResponseItem,
  ErrorLike,
  removeLeadingSlash,
  normalizeError,
} from '../common';
import { createStream } from './streaming';
import { getUiSettings } from './ui_settings';

// eslint-disable-next-line
export interface BfetchServerSetupDependencies {}

// eslint-disable-next-line
export interface BfetchServerStartDependencies {}

export interface BatchProcessingRouteParams<BatchItemData, BatchItemResult> {
  onBatchItem: (data: BatchItemData) => Promise<BatchItemResult>;
}

/** @public */
export interface BfetchServerSetup {
  addBatchProcessingRoute: <BatchItemData extends object, BatchItemResult extends object>(
    path: string,
    handler: (request: KibanaRequest) => BatchProcessingRouteParams<BatchItemData, BatchItemResult>
  ) => void;
  addStreamingResponseRoute: <Payload, Response>(
    path: string,
    params: (request: KibanaRequest) => StreamingResponseHandler<Payload, Response>
  ) => void;
}

// eslint-disable-next-line
export interface BfetchServerStart {}

const streamingHeaders = {
  'Content-Type': 'application/x-ndjson',
  Connection: 'keep-alive',
  'Transfer-Encoding': 'chunked',
};

export class BfetchServerPlugin
  implements
    Plugin<
      BfetchServerSetup,
      BfetchServerStart,
      BfetchServerSetupDependencies,
      BfetchServerStartDependencies
    >
{
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: BfetchServerSetupDependencies): BfetchServerSetup {
    const logger = this.initializerContext.logger.get();
    const router = core.http.createRouter();

    core.uiSettings.register(getUiSettings());

    const addStreamingResponseRoute = this.addStreamingResponseRoute({
      getStartServices: core.getStartServices,
      router,
      logger,
    });
    const addBatchProcessingRoute = this.addBatchProcessingRoute(addStreamingResponseRoute);

    return {
      addBatchProcessingRoute,
      addStreamingResponseRoute,
    };
  }

  public start(core: CoreStart, plugins: BfetchServerStartDependencies): BfetchServerStart {
    return {};
  }

  public stop() {}

  private addStreamingResponseRoute =
    ({
      getStartServices,
      router,
      logger,
    }: {
      getStartServices: StartServicesAccessor;
      router: ReturnType<CoreSetup['http']['createRouter']>;
      logger: Logger;
    }): BfetchServerSetup['addStreamingResponseRoute'] =>
    (path, handler) => {
      router.post(
        {
          path: `/${removeLeadingSlash(path)}`,
          validate: {
            body: schema.any(),
            query: schema.object({ compress: schema.boolean({ defaultValue: false }) }),
          },
        },
        async (context, request, response) => {
          const handlerInstance = handler(request);
          const data = request.body;
          const compress = request.query.compress;
          return response.ok({
            headers: streamingHeaders,
            body: createStream(handlerInstance.getResponseStream(data), logger, compress),
          });
        }
      );
    };

  private addBatchProcessingRoute =
    (
      addStreamingResponseRoute: BfetchServerSetup['addStreamingResponseRoute']
    ): BfetchServerSetup['addBatchProcessingRoute'] =>
    <BatchItemData extends object, BatchItemResult extends object, E extends ErrorLike = ErrorLike>(
      path: string,
      handler: (
        request: KibanaRequest
      ) => BatchProcessingRouteParams<BatchItemData, BatchItemResult>
    ) => {
      addStreamingResponseRoute<
        BatchRequestData<BatchItemData>,
        BatchResponseItem<BatchItemResult, E>
      >(path, (request) => {
        const handlerInstance = handler(request);
        return {
          getResponseStream: ({ batch }) =>
            map$(batch, async (batchItem, id) => {
              try {
                const result = await handlerInstance.onBatchItem(batchItem);
                return { id, result };
              } catch (error) {
                return { id, error: normalizeError<E>(error) };
              }
            }),
        };
      });
    };
}
