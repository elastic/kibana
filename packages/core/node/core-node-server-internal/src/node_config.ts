/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

/** @internal */
export const NODE_CONFIG_PATH = 'node' as const;
/** @internal */
export const NODE_WILDCARD_CHAR = '*';
/** @internal */
export const NODE_ACCEPTED_ROLES = ['background_tasks', 'ui'];

/** @internal */
export interface NodeConfigType {
  roles: string[];
}

const configSchema = schema.object({
  roles: schema.oneOf(
    [
      schema.arrayOf(schema.oneOf([schema.literal('background_tasks'), schema.literal('ui')])),
      schema.arrayOf(schema.literal(NODE_WILDCARD_CHAR), { minSize: 1, maxSize: 1 }),
    ],
    {
      defaultValue: [NODE_WILDCARD_CHAR],
    }
  ),
});

export const nodeConfig: ServiceConfigDescriptor<NodeConfigType> = {
  path: NODE_CONFIG_PATH,
  schema: configSchema,
};
