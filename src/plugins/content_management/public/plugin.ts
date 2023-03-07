/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
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
  public setup(core: CoreSetup, deps: SetupDependencies) {
    return {
      registry: {} as ContentTypeRegistry,
    };
  }

  public start(core: CoreStart, deps: StartDependencies) {
    const rpcClient = new RpcClient(core.http);
    const contentTypeRegistry = new ContentTypeRegistry();
    const contentClient = new ContentClient(
      (contentType) => contentTypeRegistry.get(contentType)?.crud ?? rpcClient
    );
    return { client: contentClient, registry: contentTypeRegistry };
  }
}
