/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Contains information about how this Kibana process has been configured.
 *
 * @public
 */
export interface NodeInfo {
  roles: NodeRoles;
}

/**
 * The Kibana process can be run in dedicated "modes" via `node.roles`.
 * This configuration is then exposed to plugins via `NodeRoles`,
 * which is available on the `PluginInitializerContext`.
 *
 * @public
 */
export interface NodeRoles {
  backgroundTasks: boolean;
  ui: boolean;
}
