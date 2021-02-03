/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter, ISavedObjectsRepository } from 'src/core/server';
import { storeReport, reportSchema } from '../report';

export function registerUiCountersRoute(
  router: IRouter,
  getSavedObjects: () => ISavedObjectsRepository | undefined
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
        await storeReport(internalRepository, report);
        return res.ok({ body: { status: 'ok' } });
      } catch (error) {
        return res.ok({ body: { status: 'fail' } });
      }
    }
  );
}
