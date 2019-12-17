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
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { TypesService, TypesSetup, TypesStart } from './types';
import {
  setUISettings,
  setCapabilities,
  setTypes,
  setHttp,
  setSavedObjectsClient,
  setI18n,
  setSavedObjects,
  setIndexPatterns,
} from './services';
import { ExpressionsSetup } from '../../../../../../plugins/expressions/public';
import { IEmbeddableSetup } from '../../../../../../plugins/embeddable/public';

import { visualization as visualizationFunction } from '../../expressions/visualization_function';
import { visualization as visualizationRenderer } from '../../expressions/visualization_renderer';
import { VisualizeEmbeddableFactory } from '../../embeddable/visualize_embeddable_factory';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../embeddable';
import { showNewVisModal } from '../../wizard';

import { SavedObjectRegistryProvider } from '../../legacy_imports';
import '../../saved_visualizations';
import { DataPublicPluginStart } from '../../../../../../plugins/data/public';

export interface VisualizationsSetupDeps {
  expressions: ExpressionsSetup;
  embeddable: IEmbeddableSetup;
}

export interface VisualizationsStartDeps {
  data: DataPublicPluginStart;
}

/**
 * Interface for this plugin's returned setup/start contracts.
 *
 * @public
 */
export interface VisualizationsSetup {
  types: TypesSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisualizationsStart {
  types: TypesStart;
  showNewVisModal: typeof showNewVisModal;
}

/**
 * Visualizations Plugin - public
 *
 * This plugin's stateful contracts are returned from the `setup` and `start` methods
 * below. The interfaces for these contracts are provided above.
 *
 * @internal
 */
export class VisualizationsPlugin
  implements
    Plugin<
      VisualizationsSetup,
      VisualizationsStart,
      VisualizationsSetupDeps,
      VisualizationsStartDeps
    > {
  private readonly types: TypesService = new TypesService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { expressions, embeddable }: VisualizationsSetupDeps) {
    setUISettings(core.uiSettings);

    expressions.registerFunction(visualizationFunction);
    expressions.registerRenderer(visualizationRenderer);

    embeddable.registerEmbeddableFactory(
      VISUALIZE_EMBEDDABLE_TYPE,
      new VisualizeEmbeddableFactory()
    );

    return {
      types: this.types.setup(),
    };
  }

  public start(core: CoreStart, { data }: VisualizationsStartDeps) {
    const types = this.types.start();
    setI18n(core.i18n);
    setTypes(types);
    setCapabilities(core.application.capabilities);
    setHttp(core.http);
    setSavedObjects(core.savedObjects);
    setSavedObjectsClient(core.savedObjects.client);
    setIndexPatterns(data.indexPatterns);

    SavedObjectRegistryProvider.register((savedVisualizations: any) => {
      return savedVisualizations;
    });

    return {
      types,
      showNewVisModal,
    };
  }

  public stop() {
    this.types.stop();
  }
}
