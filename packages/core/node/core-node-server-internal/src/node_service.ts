/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import { camelCase } from 'lodash';
import type { IConfigService } from '@kbn/config';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { ILoggingSystem } from '@kbn/core-logging-server-internal';
import type { NodeRoles } from '@kbn/core-node-server';
import type { Logger } from '@kbn/logging';
import {
  NodeConfigType,
  NODE_WILDCARD_CHAR,
  NODE_ACCEPTED_ROLES,
  NODE_CONFIG_PATH,
} from './node_config';

const DEFAULT_ROLES = NODE_ACCEPTED_ROLES;
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

    this.roles = NODE_ACCEPTED_ROLES.reduce((acc, curr) => {
      return { ...acc, [camelCase(curr)]: roles.includes(curr) };
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

  private async getNodeRoles(): Promise<string[]> {
    const { roles } = await firstValueFrom(
      this.configService.atPath<NodeConfigType>(NODE_CONFIG_PATH)
    );

    if (containsWildcard(roles)) {
      return DEFAULT_ROLES;
    }

    return roles;
  }
}
