/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import type { ILoggingSystem } from '@kbn/core-logging-server-internal';
import type { NodeRoles } from '@kbn/core-node-server';
/**
 * @internal
 */
export interface InternalNodeServicePreboot {
  /**
   * The Kibana process can take on specialised roles via the `node.roles` config.
   *
   * The roles can be used by plugins to adjust their behavior based
   * on the way the Kibana process has been configured.
   */
  roles: NodeRoles;
}
export interface InternalNodeServiceStart {
  /**
   * The Kibana process can take on specialised roles via the `node.roles` config.
   *
   * The roles can be used by plugins to adjust their behavior based
   * on the way the Kibana process has been configured.
   */
  roles: NodeRoles;
}
export interface PrebootDeps {
  loggingSystem: ILoggingSystem;
}
/** @internal */
export declare class NodeService {
  private readonly configService;
  private readonly log;
  private roles?;
  constructor(core: CoreContext);
  preboot({ loggingSystem }: PrebootDeps): Promise<InternalNodeServicePreboot>;
  start(): InternalNodeServiceStart;
  stop(): void;
  private getNodeRoles;
}
