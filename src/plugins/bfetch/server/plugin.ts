/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/logging';
import { Subject } from 'rxjs';
import type {
  CoreSetup,
  CoreStart,
  StartServicesAccessor,
} from '../../../core/server';
import { KibanaRequest } from '../../../core/server/http/router/request';
import type { Plugin, PluginInitializerContext } from '../../../core/server/plugins/types';
import type { BatchRequestData, BatchResponseItem, ErrorLike } from '../common/batch';
import { normalizeError } from '../common/util/normalize_error';
import { removeLeadingSlash } from '../common/util/remove_leading_slash';
import { createStream } from './streaming/create_stream';
import { getUiSettings } from './ui_settings';
import type {
  BfetchServerSetup,
  BfetchServerStart,
  BfetchServerStartDependencies,
  BfetchServerSetupDependencies,
  BatchProcessingRouteParams
} from './types';

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
    > {
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
    const createStreamingRequestHandler = this.createStreamingRequestHandler({
      getStartServices: core.getStartServices,
      logger,
    });

    return {
      addBatchProcessingRoute,
      addStreamingResponseRoute,
      createStreamingRequestHandler,
    };
  }

  public start(core: CoreStart, plugins: BfetchServerStartDependencies): BfetchServerStart {
    return {};
  }

  public stop() {}

  private getCompressionDisabled(request: KibanaRequest) {
    return request.headers['x-chunk-encoding'] !== 'deflate';
  }

  private addStreamingResponseRoute = ({
    getStartServices,
    router,
    logger,
  }: {
    getStartServices: StartServicesAccessor;
    router: ReturnType<CoreSetup['http']['createRouter']>;
    logger: Logger;
  }): BfetchServerSetup['addStreamingResponseRoute'] => (path, handler) => {
    router.post(
      {
        path: `/${removeLeadingSlash(path)}`,
        validate: {
          body: schema.any(),
        },
      },
      async (context, request, response) => {
        const handlerInstance = handler(request);
        const data = request.body;
        const compressionDisabled = this.getCompressionDisabled(request);
        return response.ok({
          headers: streamingHeaders,
          body: createStream(handlerInstance.getResponseStream(data), logger, compressionDisabled),
        });
      }
    );
  };

  private createStreamingRequestHandler = ({
    logger,
    getStartServices,
  }: {
    logger: Logger;
    getStartServices: StartServicesAccessor;
  }): BfetchServerSetup['createStreamingRequestHandler'] => (streamHandler) => async (
    context,
    request,
    response
  ) => {
    const response$ = await streamHandler(context, request);
    const compressionDisabled = this.getCompressionDisabled(request);
    return response.ok({
      headers: streamingHeaders,
      body: createStream(response$, logger, compressionDisabled),
    });
  };

  private addBatchProcessingRoute = (
    addStreamingResponseRoute: BfetchServerSetup['addStreamingResponseRoute']
  ): BfetchServerSetup['addBatchProcessingRoute'] => <
    BatchItemData extends object,
    BatchItemResult extends object,
    E extends ErrorLike = ErrorLike
  >(
    path: string,
    handler: (request: KibanaRequest) => BatchProcessingRouteParams<BatchItemData, BatchItemResult>
  ) => {
    addStreamingResponseRoute<
      BatchRequestData<BatchItemData>,
      BatchResponseItem<BatchItemResult, E>
    >(path, (request) => {
      const handlerInstance = handler(request);
      return {
        getResponseStream: ({ batch }) => {
          const subject = new Subject<BatchResponseItem<BatchItemResult, E>>();
          let cnt = batch.length;
          batch.forEach(async (batchItem, id) => {
            try {
              const result = await handlerInstance.onBatchItem(batchItem);
              subject.next({ id, result });
            } catch (err) {
              const error = normalizeError<E>(err);
              subject.next({ id, error });
            } finally {
              cnt--;
              if (!cnt) subject.complete();
            }
          });
          return subject;
        },
      };
    });
  };
}
