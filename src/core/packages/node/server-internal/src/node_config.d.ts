/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/** @internal */
export declare const NODE_CONFIG_PATH: 'node';
/**
 * Wildchar is a special config option that implies all {@link NODE_DEFAULT_ROLES} roles.
 * @internal
 */
export declare const NODE_WILDCARD_CHAR: '*';
/** @internal */
export declare const NODE_BACKGROUND_TASKS_ROLE: 'background_tasks';
/** @internal */
export declare const NODE_UI_ROLE: 'ui';
/** @internal */
export declare const NODE_MIGRATOR_ROLE: 'migrator';
/** @internal */
export declare const NODE_DEFAULT_ROLES: readonly ['background_tasks', 'ui'];
/** @internal */
export declare const NODE_ALL_ROLES: readonly ['ui', 'migrator', 'background_tasks'];
/** @internal */
export declare const rolesConfig: import('@kbn/config-schema').Type<
  ('*' | 'background_tasks' | 'migrator' | 'ui')[]
>;
/** @internal */
export type NodeRolesConfig = TypeOf<typeof rolesConfig>;
/** @internal */
export interface NodeConfigType {
  roles: NodeRolesConfig;
}
/** @internal */
export declare const nodeConfig: ServiceConfigDescriptor<NodeConfigType>;
