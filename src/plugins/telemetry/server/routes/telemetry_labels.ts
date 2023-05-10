/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core-http-server';
import type { Subject } from 'rxjs';
import apm from 'elastic-apm-node';
import { schema } from '@kbn/config-schema';
import type { TelemetryConfigLabels } from '../config';
import { labelsSchema } from '../config/telemetry_labels';

/**
 * Internal HTTP route `PUT /api/internal/telemetry/labels`
 *
 * It updates the APM agent's labels to be applied to new transactions.
 * It also extends the EBT context to be applied to new events.
 *
 * @param router
 * @param telemetryLabels$
 */
export function registerTelemetryLabelsRoutes({
  router,
  telemetryLabels$,
}: {
  router: IRouter;
  telemetryLabels$: Subject<TelemetryConfigLabels>;
}) {
  router.versioned
    .put({
      path: '/api/internal/telemetry/labels',
      access: 'internal',
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: labelsSchema,
          },
          response: {
            '200': { body: schema.object({ ok: schema.boolean() }) },
          },
        },
      },
      async (context, req, res) => {
        telemetryLabels$.next(req.body);
        Object.entries(req.body).forEach(([key, value]) => apm.setGlobalLabel(key, value));

        return res.ok({ body: { ok: true } });
      }
    );
}
