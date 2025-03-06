/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Contains information about how this Kibana process has been configured.
 *
 * @public
 */
export interface NodeInfo {
  /** A list of roles this node has been configured with. */
  roles: NodeRoles;
}

/**
 * The Kibana process can be run in dedicated "modes" via `node.roles`.
 * This configuration is then exposed to plugins via `NodeRoles`,
 * which is available on the `PluginInitializerContext`.
 *
 * The node roles can be used by plugins to adjust their behavior based
 * on the way the Kibana process has been configured.
 *
 * @public
 */
export interface NodeRoles {
  /**
   * The backgroundTasks role includes operations which don't involve
   * responding to incoming http traffic from the UI.
   */
  backgroundTasks: boolean;
  /**
   * The ui role covers any operations that need to occur in order
   * to handle http traffic from the browser.
   */
  ui: boolean;
  /**
   * Start Kibana with the specific purpose of completing the migrations phase then shutting down.
   * @remark This role is special as it precludes the use of other roles.
   */
  migrator: boolean;
}
