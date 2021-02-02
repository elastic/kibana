/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { TypeOf, schema } from '@kbn/config-schema';

export const config = {
  path: 'pid',
  schema: schema.object({
    file: schema.maybe(schema.string()),
    exclusive: schema.boolean({ defaultValue: false }),
  }),
};

export type PidConfigType = TypeOf<typeof config.schema>;
