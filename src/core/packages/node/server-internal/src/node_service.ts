/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import { camelCase } from 'lodash';
import type { IConfigService } from '@kbn/config';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { ILoggingSystem } from '@kbn/core-logging-server-internal';
import type { NodeRoles } from '@kbn/core-node-server';
import type { Logger } from '@kbn/logging';
import {
  type NodeConfigType,
  type NodeRolesConfig,
  NODE_ALL_ROLES,
  NODE_CONFIG_PATH,
  NODE_WILDCARD_CHAR,
  NODE_DEFAULT_ROLES,
} from './node_config';

const DEFAULT_ROLES = [...NODE_DEFAULT_ROLES];
const containsWildcard = (roles: string[]) => roles.includes(NODE_WILDCARD_CHAR);

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
export class NodeService {
  private readonly configService: IConfigService;
  private readonly log: Logger;
  private roles?: NodeRoles;

  constructor(core: CoreContext) {
    this.configService = core.configService;
    this.log = core.logger.get('node');
  }

  public async preboot({ loggingSystem }: PrebootDeps): Promise<InternalNodeServicePreboot> {
    const roles = await this.getNodeRoles();
    loggingSystem.setGlobalContext({ service: { node: { roles } } });
    this.log.info(`Kibana process configured with roles: [${roles.join(', ')}]`);

    // We assume the combination of node roles has been validated and avoid doing additional checks here.
    this.roles = NODE_ALL_ROLES.reduce((acc, curr) => {
      acc[camelCase(curr) as keyof NodeRoles] = (roles as string[]).includes(curr);
      return acc;
    }, {} as NodeRoles);

    return {
      roles: this.roles,
    };
  }

  public start(): InternalNodeServiceStart {
    if (this.roles == null) {
      throw new Error('NodeService#start() can only be called after NodeService#preboot()');
    }
    return { roles: this.roles };
  }

  public stop() {
    // nothing to do here yet
  }

  private async getNodeRoles(): Promise<NodeRolesConfig> {
    const { roles } = await firstValueFrom(
      this.configService.atPath<NodeConfigType>(NODE_CONFIG_PATH)
    );

    if (containsWildcard(roles)) {
      return DEFAULT_ROLES;
    }

    return roles;
  }
}
