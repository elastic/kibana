/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, TypeOf } from '@kbn/config-schema';
import { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

const hostURISchema = schema.uri({ scheme: ['http', 'https'] });

export type KibanaConfigType = TypeOf<typeof config.schema>;

export const config: ServiceConfigDescriptor = {
  path: 'kibana' as const,
  schema: schema.object({
    hosts: schema.arrayOf(hostURISchema, {
      minSize: 1,
      defaultValue: ['http://localhost:5601'],
    }),
  }),
};
