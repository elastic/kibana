/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CoreStart,
  PluginInitializerContext,
  CoreSetup,
  Plugin,
  Logger,
  KibanaRequest,
  StartServicesAccessor,
  RequestHandlerContext,
  RequestHandler,
  KibanaResponseFactory,
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BfetchServerSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
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
    params: (
      request: KibanaRequest,
      context: RequestHandlerContext
    ) => StreamingResponseHandler<Payload, Response>,
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE',
    pluginRouter?: ReturnType<CoreSetup['http']['createRouter']>
  ) => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BfetchServerStart {}

const streamingHeaders = {
  'Content-Type': 'application/x-ndjson',
  Connection: 'keep-alive',
  'Transfer-Encoding': 'chunked',
};

interface Query {
  compress: boolean;
}
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
    (path, handler, method = 'POST', pluginRouter) => {
      const httpRouter = pluginRouter || router;
      const routeDefinition = {
        path: `/${removeLeadingSlash(path)}`,
        validate: {
          body: schema.any(),
          query: schema.object({ compress: schema.boolean({ defaultValue: false }) }),
        },
      };
      const routeHandler: RequestHandler<unknown, Query> = async (
        context: RequestHandlerContext,
        request: KibanaRequest<unknown, Query, any>,
        response: KibanaResponseFactory
      ) => {
        const handlerInstance = handler(request, context);
        const data = request.body;
        const compress = request.query.compress;
        return response.ok({
          headers: streamingHeaders,
          body: createStream(handlerInstance.getResponseStream(data), logger, compress),
        });
      };

      switch (method) {
        case 'GET':
          httpRouter.get(routeDefinition, routeHandler);
          break;
        case 'POST':
          httpRouter.post(routeDefinition, routeHandler);
          break;
        case 'PUT':
          httpRouter.put(routeDefinition, routeHandler);
          break;
        case 'DELETE':
          httpRouter.delete(routeDefinition, routeHandler);
          break;
        default:
          throw new Error(`Handler for method ${method} is not defined`);
      }
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
