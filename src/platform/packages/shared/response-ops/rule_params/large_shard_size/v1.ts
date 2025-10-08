/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import { stackMonitoringCommonSchema } from '../common';

export const largeShardSizeParamsSchema = stackMonitoringCommonSchema.extends({
  indexPattern: schema.string({}),
});
export type LargeShardSizeParams = TypeOf<typeof largeShardSizeParamsSchema>;
