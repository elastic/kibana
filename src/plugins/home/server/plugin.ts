/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup } from '../../../core/server';
import type { Plugin, PluginInitializerContext } from '../../../core/server/plugins/types';
import type { UsageCollectionSetup } from '../../usage_collection/server/plugin';
import { capabilitiesProvider } from './capabilities_provider';
import { registerRoutes } from './routes';
import { sampleDataTelemetry } from './saved_objects/sample_data_telemetry';
import type {
  SampleDataRegistrySetup,
  SampleDataRegistryStart,
} from './services/sample_data/sample_data_registry';
import { SampleDataRegistry } from './services/sample_data/sample_data_registry';
import type {
  TutorialsRegistrySetup,
  TutorialsRegistryStart,
} from './services/tutorials/tutorials_registry';
import { TutorialsRegistry } from './services/tutorials/tutorials_registry';

interface HomeServerPluginSetupDependencies {
  usageCollection?: UsageCollectionSetup;
}

export class HomeServerPlugin implements Plugin<HomeServerPluginSetup, HomeServerPluginStart> {
  constructor(private readonly initContext: PluginInitializerContext) {}
  private readonly tutorialsRegistry = new TutorialsRegistry();
  private readonly sampleDataRegistry = new SampleDataRegistry(this.initContext);

  public setup(core: CoreSetup, plugins: HomeServerPluginSetupDependencies): HomeServerPluginSetup {
    core.capabilities.registerProvider(capabilitiesProvider);
    core.savedObjects.registerType(sampleDataTelemetry);

    const router = core.http.createRouter();
    registerRoutes(router);

    return {
      tutorials: { ...this.tutorialsRegistry.setup(core) },
      sampleData: { ...this.sampleDataRegistry.setup(core, plugins.usageCollection) },
    };
  }

  public start(): HomeServerPluginStart {
    return {
      tutorials: { ...this.tutorialsRegistry.start() },
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
