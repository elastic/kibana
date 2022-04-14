/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter, Logger, CoreSetup } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import _ from 'lodash';
// @ts-ignore
import chainRunnerFn from '../handlers/chain_runner.js';
// @ts-ignore
import getNamespacesSettings from '../lib/get_namespaced_settings';
// @ts-ignore
import getTlConfig from '../handlers/lib/tl_config';
import { TimelionFunctionInterface } from '../types';
import { ConfigManager } from '../lib/config_manager';
import { TimelionPluginStartDeps } from '../plugin';

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
    core: CoreSetup<TimelionPluginStartDeps>;
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
      const [, { dataViews }] = await core.getStartServices();
      const uiSettings = await context.core.uiSettings.client.getAll();
      const indexPatternsService = await dataViews.dataViewsServiceFactory(
        context.core.savedObjects.client,
        context.core.elasticsearch.client.asCurrentUser
      );

      const tlConfig = getTlConfig({
        context,
        request,
        settings: _.defaults(uiSettings, timelionDefaults), // Just in case they delete some setting.
        getFunction,
        getIndexPatternsService: () => indexPatternsService,
        getStartServices: core.getStartServices,
        esShardTimeout: configManager.getEsShardTimeout(),
      });
      try {
        const chainRunner = chainRunnerFn(tlConfig);
        const sheet = await Promise.all(await chainRunner.processRequest(request.body));
        return response.ok({
          body: {
            sheet,
            stats: chainRunner.getStats(),
          },
        });
      } catch (e) {
        return response.badRequest({ body: { message: e.message } });
      }
    })
  );
}
