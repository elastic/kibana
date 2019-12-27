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

import { CoreStart, PluginInitializerContext, CoreSetup, Plugin, Logger } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { Subject } from 'rxjs';
import {
  StreamingResponseHandler,
  BatchRequestData,
  BatchResponseItem,
  ErrorLike,
  removeLeadingSlash,
} from '../common';
import { createNDJSONStream } from './streaming';

// eslint-disable-next-line
export interface BfetchServerSetupDependencies {}

// eslint-disable-next-line
export interface BfetchServerStartDependencies {}

export interface BfetchServerSetup {
  addBatchProcessingRoute: <Request extends object, Response extends object>(
    path: string,
    onBatchItem: (request: Request) => Promise<Response>
  ) => void;
  addStreamingResponseRoute: <Payload, Response>(
    path: string,
    handler: StreamingResponseHandler<Payload, Response>
  ) => void;
}

// eslint-disable-next-line
export interface BfetchServerStart {}

const normalizeError = <E extends ErrorLike = ErrorLike>(err: any): E => {
  if (!err) {
    return {
      message: 'Unknown error.',
    } as E;
  }
  if (err instanceof Error) {
    return { message: err.message } as E;
  }
  if (typeof err === 'object') {
    return {
      ...err,
      message: err.message || 'Unknown error.',
    } as E;
  }
  return {
    message: String(err),
  } as E;
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
    const addStreamingResponseRoute = this.addStreamingResponseRoute({ router, logger });
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

  private addStreamingResponseRoute = ({
    router,
    logger,
  }: {
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
        const data = request.body;
        return response.ok({
          headers: {
            'Content-Type': 'application/x-ndjson',
            Connection: 'keep-alive',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
          },
          body: createNDJSONStream(data, handler, logger),
        });
      }
    );
  };

  private addBatchProcessingRoute = (
    addStreamingResponseRoute: BfetchServerSetup['addStreamingResponseRoute']
  ): BfetchServerSetup['addBatchProcessingRoute'] => <
    Request extends object,
    Response extends object,
    E extends ErrorLike = ErrorLike
  >(
    path: string,
    onBatchItem: (request: Request) => Promise<Response>
  ) => {
    addStreamingResponseRoute<BatchRequestData<Request>, BatchResponseItem<Response, E>>(path, {
      onRequest: batch => {
        const subject = new Subject<BatchResponseItem<Response, E>>();
        batch.forEach(async (batchItem, id) => {
          try {
            const result = await onBatchItem(batchItem);
            subject.next({ id, result });
          } catch (err) {
            const error = normalizeError<E>(err);
            subject.next({ id, error });
          }
        });
        return subject;
      },
    });
  };
}
