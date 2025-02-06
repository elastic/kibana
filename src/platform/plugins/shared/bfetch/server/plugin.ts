/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  AnalyticsServiceStart,
  HttpProtocol,
} from '@kbn/core/server';

import { map$ } from '@kbn/std';
import { schema } from '@kbn/config-schema';
import { BFETCH_ROUTE_VERSION_LATEST } from '../common/constants';
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

export interface BfetchServerStartDependencies {
  analytics?: AnalyticsServiceStart;
}

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

const getStreamingHeaders = (protocol: HttpProtocol): Record<string, string> => {
  if (protocol === 'http2') {
    return {
      'Content-Type': 'application/x-ndjson',
      'X-Accel-Buffering': 'no',
    };
  }
  return {
    'Content-Type': 'application/x-ndjson',
    Connection: 'keep-alive',
    'Transfer-Encoding': 'chunked',
    'X-Accel-Buffering': 'no',
  };
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
  private _analyticsService: AnalyticsServiceStart | undefined;

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
    this._analyticsService = core.analytics;
    return {};
  }

  public stop() {}

  private addStreamingResponseRoute =
    ({
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
        version: BFETCH_ROUTE_VERSION_LATEST,
        validate: {
          request: {
            body: schema.any(),
            query: schema.object({ compress: schema.boolean({ defaultValue: false }) }),
          },
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
          headers: getStreamingHeaders(request.protocol),
          body: createStream(
            handlerInstance.getResponseStream(data),
            logger,
            compress,
            this._analyticsService
          ),
        });
      };

      switch (method) {
        case 'GET':
          httpRouter.versioned
            .get({ access: 'internal', path: `/${removeLeadingSlash(path)}` })
            .addVersion(routeDefinition, routeHandler);
          break;
        case 'POST':
          httpRouter.versioned
            .post({ access: 'internal', path: `/${removeLeadingSlash(path)}` })
            .addVersion(routeDefinition, routeHandler);
          break;
        case 'PUT':
          httpRouter.versioned
            .put({ access: 'internal', path: `/${removeLeadingSlash(path)}` })
            .addVersion(routeDefinition, routeHandler);
          break;
        case 'DELETE':
          httpRouter.versioned
            .delete({ access: 'internal', path: `/${removeLeadingSlash(path)}` })
            .addVersion(routeDefinition, routeHandler);
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
