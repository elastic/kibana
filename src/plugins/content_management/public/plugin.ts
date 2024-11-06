/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import {
  ContentManagementPublicStart,
  ContentManagementPublicSetup,
  SetupDependencies,
  StartDependencies,
} from './types';
import { ContentClient } from './content_client';
import { ContentTypeRegistry } from './registry';
import { RpcClient } from './rpc_client';

export class ContentManagementPlugin
  implements
    Plugin<
      ContentManagementPublicSetup,
      ContentManagementPublicStart,
      SetupDependencies,
      StartDependencies
    >
{
  private contentTypeRegistry: ContentTypeRegistry;

  constructor() {
    this.contentTypeRegistry = new ContentTypeRegistry();
  }

  public setup() {
    return {
      registry: {
        register: this.contentTypeRegistry.register.bind(this.contentTypeRegistry),
      },
    };
  }

  public start(core: CoreStart, deps: StartDependencies) {
    const rpcClient = new RpcClient(core.http);

    const contentClient = new ContentClient((contentType) => {
      if (!contentType) return rpcClient;
      return this.contentTypeRegistry.get(contentType)?.crud ?? rpcClient;
    }, this.contentTypeRegistry);
    return {
      client: contentClient,
      registry: {
        get: this.contentTypeRegistry.get.bind(this.contentTypeRegistry),
        getAll: this.contentTypeRegistry.getAll.bind(this.contentTypeRegistry),
      },
    };
  }
}
