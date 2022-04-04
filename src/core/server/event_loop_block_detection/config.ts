/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TypeOf, schema } from '@kbn/config-schema';

/**
 * @internal
 */
export type EventLoopBlockDetectionConfigType = TypeOf<typeof config.schema>;

export const config = {
  path: 'eventLoopBlockDetection',
  schema: schema.object({
    enabled: schema.boolean({ defaultValue: true }),
    threshold: schema.duration({ defaultValue: '200ms' }),
  }),
};
