/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  CustomIntegrationsSetup,
  CustomIntegrationsStart,
  CustomIntegrationsStartDependencies,
} from './types';
import {
  CustomIntegration,
  ROUTES_APPEND_CUSTOM_INTEGRATIONS,
  ROUTES_REPLACEMENT_CUSTOM_INTEGRATIONS,
} from '../common';

import { CustomIntegrationsServicesProvider } from './services';
import { servicesFactory } from './services/kibana';

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
    };
  }

  public start(
    coreStart: CoreStart,
    startPlugins: CustomIntegrationsStartDependencies
  ): CustomIntegrationsStart {
    const services = servicesFactory({ coreStart, startPlugins });
    const ContextProvider: React.FC = ({ children }) => (
      <CustomIntegrationsServicesProvider {...services}>
        {children}
      </CustomIntegrationsServicesProvider>
    );

    return {
      ContextProvider,
    };
  }

  public stop() {}
}
