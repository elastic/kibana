/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IRouter, Logger, CoreSetup } from 'kibana/server';
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

export function runRoute(
  router: IRouter,
  {
    logger,
    getFunction,
    configManager,
    core,
  }: {
    logger: Logger;
    getFunction: (name: string) => TimelionFunctionInterface;
    configManager: ConfigManager;
    core: CoreSetup;
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
          searchSession: schema.maybe(
            schema.object({
              sessionId: schema.string(),
              isRestore: schema.boolean({ defaultValue: false }),
              isStored: schema.boolean({ defaultValue: false }),
            })
          ),
        }),
      },
    },
    router.handleLegacyErrors(async (context, request, response) => {
      try {
        const uiSettings = await context.core.uiSettings.client.getAll();

        const tlConfig = getTlConfig({
          context,
          request,
          settings: _.defaults(uiSettings, timelionDefaults), // Just in case they delete some setting.
          getFunction,
          getStartServices: core.getStartServices,
          allowedGraphiteUrls: configManager.getGraphiteUrls(),
          esShardTimeout: configManager.getEsShardTimeout(),
          savedObjectsClient: context.core.savedObjects.client,
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
