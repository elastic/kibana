/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { getDashboardStateSchema } from '../dashboard_state_schemas';
import { metaSchema } from '../meta_schemas';

export function getUpdateRequestBodySchema(isDashboardAppRequest: boolean) {
  // changing access control is not allowed through update endpoint
  const { access_control, ...rest } =
    getDashboardStateSchema(isDashboardAppRequest).getPropSchemas();
  return schema.object(rest);
}

export function getUpdateResponseBodySchema(isDashboardAppRequest: boolean) {
  // update endpoint does not return created meta fields
  const { created_at, created_by, ...restOfMeta } = metaSchema.getPropSchemas();
  return schema.object({
    id: schema.string(),
    data: getDashboardStateSchema(isDashboardAppRequest),
    meta: schema.object(restOfMeta),
  });
}
