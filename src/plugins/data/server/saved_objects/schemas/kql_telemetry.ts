/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

export const SCHEMA_KQL_TELEMETRY_V8_8_0 = schema.object({
  optInCount: schema.maybe(schema.number()),
  optOutCount: schema.maybe(schema.number()),
});
