/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { asCodeMetaSchema } from '@kbn/as-code-shared-schemas';
import { getDashboardStateSchema } from '../dashboard_state_schemas';

export function getUpdateResponseBodySchema(isDashboardAppRequest: boolean) {
  return schema.object({
    id: schema.string({
      meta: {
        description:
          'The unique ID of the dashboard, as returned by the create or search endpoints.',
      },
    }),
    data: getDashboardStateSchema(isDashboardAppRequest),
    meta: asCodeMetaSchema,
  });
}
