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

/* eslint-disable max-classes-per-file */

// TODO: Remove this file once https://github.com/elastic/kibana/issues/46906 is complete.

// @ts-ignore
import { register, registryFactory, Registry, Fn } from '@kbn/interpreter/common';

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { CoreSetup, Logger } from 'src/core/server';
import { ExpressionsServerSetupDependencies } from './plugin';
import { typeSpecs, ExpressionType } from '../common';
import { serializeProvider } from '../common';

export class TypesRegistry extends Registry<any, any> {
  wrapper(obj: any) {
    return new (ExpressionType as any)(obj);
  }
}

export class FunctionsRegistry extends Registry<any, any> {
  wrapper(obj: any) {
    return new Fn(obj);
  }
}

export const registries = {
  types: new TypesRegistry(),
  serverFunctions: new FunctionsRegistry(),
};

export interface LegacyInterpreterServerApi {
  registries(): typeof registries;
  register(specs: Record<keyof typeof registries, any[]>): typeof registries;
}

export const createLegacyServerInterpreterApi = (): LegacyInterpreterServerApi => {
  const api = registryFactory(registries);

  register(registries, {
    types: typeSpecs,
  });

  return api;
};

export const createLegacyServerEndpoints = (
  api: LegacyInterpreterServerApi,
  logger: Logger,
  core: CoreSetup,
  plugins: ExpressionsServerSetupDependencies
) => {
  const router = core.http.createRouter();

  /**
   * Register the endpoint that returns the list of server-only functions.
   */
  router.get(
    {
      path: `/api/interpreter/fns`,
      validate: {
        body: schema.any(),
      },
    },
    async (context, request, response) => {
      const functions = api.registries().serverFunctions.toJS();
      const body = JSON.stringify(functions);
      return response.ok({
        body,
      });
    }
  );

  /**
   * Run a single Canvas function.
   *
   * @param {*} server - The Kibana server object
   * @param {*} handlers - The Canvas handlers
   * @param {*} fnCall - Describes the function being run `{ functionName, args, context }`
   */
  async function runFunction(handlers: any, fnCall: any) {
    const { functionName, args, context } = fnCall;
    const { deserialize } = serializeProvider(registries.types.toJS());
    const fnDef = registries.serverFunctions.toJS()[functionName];
    if (!fnDef) throw Boom.notFound(`Function "${functionName}" could not be found.`);
    const deserialized = deserialize(context);
    const result = fnDef.fn(deserialized, args, handlers);
    return result;
  }

  /**
   * Register an endpoint that executes a batch of functions, and streams the
   * results back using ND-JSON.
   */
  plugins.bfetch.addBatchProcessingRoute(`/api/interpreter/fns`, request => {
    const scopedClient = core.elasticsearch.dataClient.asScoped(request);
    const handlers = {
      environment: 'server',
      elasticsearchClient: async (
        endpoint: string,
        clientParams: Record<string, any> = {},
        options?: any
      ) => scopedClient.callAsCurrentUser(endpoint, clientParams, options),
    };

    return {
      onBatchItem: async (fnCall: any) => {
        const result = await runFunction(handlers, fnCall);
        if (typeof result === 'undefined') {
          throw new Error(`Function ${fnCall.functionName} did not return anything.`);
        }
        return result;
      },
    };
  });
};
