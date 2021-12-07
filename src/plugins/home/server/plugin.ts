/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'kibana/server';
import {
  TutorialsRegistry,
  TutorialsRegistrySetup,
  TutorialsRegistryStart,
  SampleDataRegistry,
  SampleDataRegistrySetup,
  SampleDataRegistryStart,
} from './services';
import { UsageCollectionSetup } from '../../usage_collection/server';
import { capabilitiesProvider } from './capabilities_provider';
import { sampleDataTelemetry } from './saved_objects';
import { registerRoutes } from './routes';
import { CustomIntegrationsPluginSetup } from '../../custom_integrations/server';

export interface HomeServerPluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
  customIntegrations?: CustomIntegrationsPluginSetup;
}

export class HomeServerPlugin implements Plugin<HomeServerPluginSetup, HomeServerPluginStart> {
  private readonly tutorialsRegistry;
  private readonly sampleDataRegistry: SampleDataRegistry;
  private customIntegrations?: CustomIntegrationsPluginSetup;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.sampleDataRegistry = new SampleDataRegistry(this.initContext);
    this.tutorialsRegistry = new TutorialsRegistry(this.initContext);
  }

  public setup(core: CoreSetup, plugins: HomeServerPluginSetupDependencies): HomeServerPluginSetup {
    this.customIntegrations = plugins.customIntegrations;

    core.capabilities.registerProvider(capabilitiesProvider);
    core.savedObjects.registerType(sampleDataTelemetry);

    const router = core.http.createRouter();
    registerRoutes(router);

    return {
      tutorials: { ...this.tutorialsRegistry.setup(core, plugins.customIntegrations) },
      sampleData: {
        ...this.sampleDataRegistry.setup(core, plugins.usageCollection, plugins.customIntegrations),
      },
    };
  }

  public start(core: CoreStart): HomeServerPluginStart {
    return {
      tutorials: { ...this.tutorialsRegistry.start(core, this.customIntegrations) },
      sampleData: { ...this.sampleDataRegistry.start() },
    };
  }
}

/** @public */
export interface HomeServerPluginSetup {
  tutorials: TutorialsRegistrySetup;
  sampleData: SampleDataRegistrySetup;
}

/** @public */
export interface HomeServerPluginStart {
  tutorials: TutorialsRegistryStart;
  sampleData: SampleDataRegistryStart;
}
