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
import { IRouter, Logger } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import Bluebird from 'bluebird';
import _ from 'lodash';
// @ts-ignore
import chainRunnerFn from '../handlers/chain_runner.js';
// @ts-ignore
import getNamespacesSettings from '../lib/get_namespaced_settings';
// @ts-ignore
import getTlConfig from '../handlers/lib/tl_config';
import { TimelionFunctionInterface } from '../types';
import { ConfigManager } from '../lib/config_manager';

const timelionDefaults = getNamespacesSettings();

export interface TimelionRequestQuery {
  payload: {
    sheet: string[];
    extended?: {
      es: {
        filter: {
          bool: {
            filter: string[] | object;
            must: string[];
            should: string[];
            must_not: string[];
          };
        };
      };
    };
  };
  time?: {
    from?: string;
    interval: string;
    timezone: string;
    to?: string;
  };
}

export function runRoute(
  router: IRouter,
  {
    logger,
    getFunction,
    configManager,
  }: {
    logger: Logger;
    getFunction: (name: string) => TimelionFunctionInterface;
    configManager: ConfigManager;
  }
) {
  router.post(
    {
      path: '/api/timelion/run',
      validate: {
        body: schema.object({
          sheet: schema.arrayOf(schema.string()),
          extended: schema.maybe(
            schema.object({
              es: schema.object({
                filter: schema.object({
                  bool: schema.object({
                    filter: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
                    must: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
                    should: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
                    must_not: schema.maybe(
                      schema.arrayOf(schema.object({}, { unknowns: 'allow' }))
                    ),
                  }),
                }),
              }),
            })
          ),
          time: schema.maybe(
            schema.object({
              from: schema.maybe(schema.string()),
              interval: schema.string(),
              timezone: schema.string(),
              to: schema.maybe(schema.string()),
            })
          ),
        }),
      },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      try {
        const uiSettings = await context.core.uiSettings.client.getAll();

        const tlConfig = getTlConfig({
          request,
          settings: _.defaults(uiSettings, timelionDefaults), // Just in case they delete some setting.
          getFunction,
          allowedGraphiteUrls: configManager.getGraphiteUrls(),
          esShardTimeout: configManager.getEsShardTimeout(),
          savedObjectsClient: context.core.savedObjects.client,
          esDataClient: () => context.core.elasticsearch.dataClient,
        });
        const chainRunner = chainRunnerFn(tlConfig);
        const sheet = await Bluebird.all(chainRunner.processRequest(request.body));

        return response.ok({
          body: {
            sheet,
            stats: chainRunner.getStats(),
          },
        });
      } catch (err) {
        logger.error(`${err.toString()}: ${err.stack}`);
        // TODO Maybe we should just replace everywhere we throw with Boom? Probably.
        if (err.isBoom) {
          throw err;
        } else {
          return response.internalError({
            body: {
              message: err.toString(),
            },
          });
        }
      }
    })
  );
}
