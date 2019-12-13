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

import { CoreStart, PluginInitializerContext, CoreSetup, Plugin } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { StreamingResponseHandler, removeLeadingSlash } from '../common';
import { createStreamingResponseStream } from './streaming';

// eslint-disable-next-line
export interface BfetchServerSetupDependencies {}

// eslint-disable-next-line
export interface BfetchServerStartDependencies {}

export interface BfetchServerSetup {
  addStreamingResponseRoute: (path: string, handler: StreamingResponseHandler<any, any>) => void;
}

// eslint-disable-next-line
export interface BfetchServerStart {}

export class BfetchServerPlugin
  implements
    Plugin<
      BfetchServerSetup,
      BfetchServerStart,
      BfetchServerSetupDependencies,
      BfetchServerStartDependencies
    > {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: BfetchServerSetupDependencies): BfetchServerSetup {
    const router = core.http.createRouter();
    const addStreamingResponseRoute = this.addStreamingResponseRoute(router);

    return {
      addStreamingResponseRoute,
    };
  }

  public start(core: CoreStart, plugins: BfetchServerStartDependencies): BfetchServerStart {
    return {};
  }

  public stop() {}

  private addStreamingResponseRoute = (
    router: ReturnType<CoreSetup['http']['createRouter']>
  ): BfetchServerSetup['addStreamingResponseRoute'] => (path, handler) => {
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
          body: createStreamingResponseStream(data, handler),
        });
      }
    );
  };
}
