/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

/** @internal */
export const NODE_CONFIG_PATH = 'node' as const;
/**
 * Wildchar is a special config option that implies all {@link NODE_DEFAULT_ROLES} roles.
 * @internal
 */
export const NODE_WILDCARD_CHAR = '*' as const;
/** @internal */
export const NODE_BACKGROUND_TASKS_ROLE = 'background_tasks' as const;
/** @internal */
export const NODE_UI_ROLE = 'ui' as const;
/** @internal */
export const NODE_MIGRATOR_ROLE = 'migrator' as const;
/** @internal */
export const NODE_DEFAULT_ROLES = [NODE_BACKGROUND_TASKS_ROLE, NODE_UI_ROLE] as const;
/** @internal */
export const NODE_ALL_ROLES = [
  NODE_UI_ROLE,
  NODE_MIGRATOR_ROLE,
  NODE_BACKGROUND_TASKS_ROLE,
] as const;

/** @internal */
export const rolesConfig = schema.arrayOf(
  schema.oneOf([
    schema.literal(NODE_BACKGROUND_TASKS_ROLE),
    schema.literal(NODE_MIGRATOR_ROLE),
    schema.literal(NODE_WILDCARD_CHAR),
    schema.literal(NODE_UI_ROLE),
  ]),
  {
    defaultValue: [NODE_WILDCARD_CHAR],
    minSize: 1,
    validate: (value) => {
      if (value.length > 1) {
        if (value.includes(NODE_WILDCARD_CHAR)) {
          return `wildcard ("*") cannot be used with other roles or specified more than once`;
        }
        if (value.includes(NODE_MIGRATOR_ROLE)) {
          return `"migrator" cannot be used with other roles or specified more than once`;
        }
      }
    },
  }
);

/** @internal */
export type NodeRolesConfig = TypeOf<typeof rolesConfig>;

/** @internal */
export interface NodeConfigType {
  roles: NodeRolesConfig;
}

const configSchema = schema.object({
  roles: rolesConfig,
});

/** @internal */
export const nodeConfig: ServiceConfigDescriptor<NodeConfigType> = {
  path: NODE_CONFIG_PATH,
  schema: configSchema,
};
