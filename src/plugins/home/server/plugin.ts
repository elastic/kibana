/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/server';
import {
  TutorialsRegistry,
  TutorialsRegistrySetup,
  TutorialsRegistryStart,
  SampleDataRegistry,
  SampleDataRegistrySetup,
  SampleDataRegistryStart,
} from './services';
import { UsageCollectionSetup } from '../../usage_collection/server';

interface HomeServerPluginSetupDependencies {
  usage_collection?: UsageCollectionSetup;
}

export class HomeServerPlugin implements Plugin<HomeServerPluginSetup, HomeServerPluginStart> {
  constructor(private readonly initContext: PluginInitializerContext) {}
  private readonly tutorialsRegistry = new TutorialsRegistry();
  private readonly sampleDataRegistry = new SampleDataRegistry(this.initContext);

  public setup(core: CoreSetup, plugins: HomeServerPluginSetupDependencies): HomeServerPluginSetup {
    return {
      tutorials: { ...this.tutorialsRegistry.setup(core) },
      sampleData: { ...this.sampleDataRegistry.setup(core, plugins.usage_collection) },
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
