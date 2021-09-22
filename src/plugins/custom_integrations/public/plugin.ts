/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { CustomIntegrationsSetup, CustomIntegrationsStart } from './types';
import { CustomIntegration, ROUTES_ADDABLECUSTOMINTEGRATIONS } from '../common';

export class CustomIntegrationPlugin
  implements Plugin<CustomIntegrationsSetup, CustomIntegrationsStart>
{
  public setup(core: CoreSetup): CustomIntegrationsSetup {
    // Return methods that should be available to other plugins
    return {
      async getAppendCustomIntegrations(): Promise<CustomIntegration[]> {
        return core.http.get(ROUTES_ADDABLECUSTOMINTEGRATIONS);
      },
    } as CustomIntegrationsSetup;
  }

  public start(core: CoreStart): CustomIntegrationsStart {
    return {};
  }

  public stop() {}
}
