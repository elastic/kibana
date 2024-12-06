/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
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

    const languageClientsUiComponents = {
      sample: React.lazy(async () => ({
        default: (await import('./language_components')).SampleClientReadme,
      })),
      javascript: React.lazy(async () => ({
        default: (await import('./language_components')).ElasticsearchJsClientReadme,
      })),
      python: React.lazy(async () => ({
        default: (await import('./language_components')).ElasticsearchPyClientReadme,
      })),
      go: React.lazy(async () => ({
        default: (await import('./language_components')).ElasticsearchGoClientReadme,
      })),
      ruby: React.lazy(async () => ({
        default: (await import('./language_components')).ElasticsearchRubyClientReadme,
      })),
      java: React.lazy(async () => ({
        default: (await import('./language_components')).ElasticsearchJavaClientReadme,
      })),
      php: React.lazy(async () => ({
        default: (await import('./language_components')).ElasticsearchPhpClientReadme,
      })),
      dotnet: React.lazy(async () => ({
        default: (await import('./language_components')).ElasticsearchDotnetClientReadme,
      })),
    };

    const ContextProvider: FC<PropsWithChildren<unknown>> = ({ children }) => (
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
