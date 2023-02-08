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
import type { ContentClient } from './content_client';

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
    return {};
  }

  public start(core: CoreStart, deps: StartDependencies) {
    // don't actually expose the client until it is used to avoid increasing bundle size
    // const rpcClient = new RpcClient(core.http);
    // const contentClient = new ContentClient(rpcClient);
    // return { client: contentClient };
    return { client: {} as ContentClient };
  }
}
