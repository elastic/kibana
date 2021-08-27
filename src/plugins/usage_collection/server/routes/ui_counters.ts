/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from '../../../../core/server/http/router/router';
import type { ISavedObjectsRepository } from '../../../../core/server/saved_objects/service/lib/repository';
import { reportSchema } from '../report/schema';
import { storeReport } from '../report/store_report';
import type { IUsageCounter as UsageCounter } from '../usage_counters/usage_counter';

export function registerUiCountersRoute(
  router: IRouter,
  getSavedObjects: () => ISavedObjectsRepository | undefined,
  uiCountersUsageCounter: UsageCounter
) {
  router.post(
    {
      path: '/api/ui_counters/_report',
      validate: {
        body: schema.object({
          report: reportSchema,
        }),
      },
    },
    async (context, req, res) => {
      const { report } = req.body;
      try {
        const internalRepository = getSavedObjects();
        if (!internalRepository) {
          throw Error(`The saved objects client hasn't been initialised yet`);
        }
        await storeReport(internalRepository, uiCountersUsageCounter, report);
        return res.ok({ body: { status: 'ok' } });
      } catch (error) {
        return res.ok({ body: { status: 'fail' } });
      }
    }
  );
}
