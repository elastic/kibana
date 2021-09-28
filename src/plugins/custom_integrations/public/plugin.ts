/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { CustomIntegrationsSetup, CustomIntegrationsStart } from './types';
import {
  CustomIntegration,
  ROUTES_APPEND_CUSTOM_INTEGRATIONS,
  ROUTES_REPLACEMENT_CUSTOM_INTEGRATIONS,
} from '../common';

export class CustomIntegrationsPlugin
  implements Plugin<CustomIntegrationsSetup, CustomIntegrationsStart>
{
  public setup(core: CoreSetup): CustomIntegrationsSetup {
    // Return methods that should be available to other plugins
    return {
      async getReplacementCustomIntegrations(): Promise<CustomIntegration[]> {
        return core.http.get(ROUTES_REPLACEMENT_CUSTOM_INTEGRATIONS);
      },

      async getAppendCustomIntegrations(): Promise<CustomIntegration[]> {
        return core.http.get(ROUTES_APPEND_CUSTOM_INTEGRATIONS);
      },

      findReplacementsForEprPackage(
        integrations: CustomIntegration[],
        packageName: string,
        release: 'beta' | 'experimental' | 'ga'
      ): CustomIntegration[] {
        if (release === 'ga') {
          return [];
        }
        const replacements = integrations.filter((customIntegration: CustomIntegration) => {
          return customIntegration.eprOverlap === packageName;
        });
        return replacements;
      },
    } as CustomIntegrationsSetup;
  }

  public start(core: CoreStart): CustomIntegrationsStart {
    return {};
  }

  public stop() {}
}
