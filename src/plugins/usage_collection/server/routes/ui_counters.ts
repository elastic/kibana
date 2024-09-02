/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, ISavedObjectsRepository } from '@kbn/core/server';
import { storeUiReport, reportSchema } from '../report';
import type { UsageCountersServiceSetup } from '../usage_counters';
import type { UiCounters } from '../../common/types';

export function registerUiCountersRoute(
  router: IRouter,
  getSavedObjects: () => ISavedObjectsRepository | undefined,
  usageCounters: UsageCountersServiceSetup
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
      const requestBody: UiCounters.v1.UiCountersRequestBody = req.body;
      try {
        const internalRepository = getSavedObjects();
        if (!internalRepository) {
          throw Error(`The saved objects client hasn't been initialised yet`);
        }
        // we need to create UI counters dynamically if not explicitly created on server-side
        await storeUiReport(internalRepository, usageCounters, requestBody.report);
        const bodyOk: UiCounters.v1.UiCountersResponseOk = {
          status: 'ok',
        };
        return res.ok({ body: bodyOk });
      } catch (error) {
        const bodyFail: UiCounters.v1.UiCountersResponseFail = {
          status: 'fail',
        };
        return res.ok({ body: bodyFail });
      }
    }
  );
}
