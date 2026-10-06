/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import type {
  ContentManagementPublicStart,
  ContentManagementPublicSetup,
  SetupDependencies,
  StartDependencies,
} from './types';
import type { ContentClient } from './content_client';
export declare class ContentManagementPlugin
  implements
    Plugin<
      ContentManagementPublicSetup,
      ContentManagementPublicStart,
      SetupDependencies,
      StartDependencies
    >
{
  private contentTypeRegistry;
  constructor();
  setup(): {
    registry: {
      register: (
        definition: import('./registry').ContentTypeDefinition
      ) => import('./registry').ContentType;
    };
  };
  start(
    core: CoreStart,
    deps: StartDependencies
  ): {
    client: ContentClient;
    registry: {
      get: (id: string) => import('./registry').ContentType | undefined;
      getAll: () => import('./registry').ContentType[];
    };
  };
}
