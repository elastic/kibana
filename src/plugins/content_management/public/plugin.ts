/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import {
  ContentManagementPublicStart,
  ContentManagementPublicSetup,
  SetupDependencies,
} from './types';

export class ContentManagementPlugin
  implements Plugin<ContentManagementPublicSetup, ContentManagementPublicStart, SetupDependencies>
{
  public setup(core: CoreSetup, deps: SetupDependencies) {
    return {};
  }

  public start() {
    return {};
  }
}
