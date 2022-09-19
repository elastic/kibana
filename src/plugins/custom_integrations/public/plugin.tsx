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
import { languageIntegrations } from '../common/language_integrations';

import { OverviewComponent } from './components/fleet_integration/overview_component';

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

    const languageClientsUiComponents = new Map<string, React.FC>();

    // Set the language clients components to render in Fleet plugin under Integrations app
    // Export component only if the integration has exportLanguageUiComponent = true
    languageIntegrations
      .filter((int) => int.exportLanguageUiComponent)
      .map((int) => {
        const ReadmeComponent = () => <OverviewComponent packageName={`${int.id}`} />;
        languageClientsUiComponents.set(`language_client.${int.id}`, ReadmeComponent);
      });

    const ContextProvider: React.FC = ({ children }) => (
      <CustomIntegrationsServicesProvider {...services}>
        {children}
      </CustomIntegrationsServicesProvider>
    );

    return {
      ContextProvider,
      languageClientsUiComponents,
    };
  }

  public stop() {}
}
