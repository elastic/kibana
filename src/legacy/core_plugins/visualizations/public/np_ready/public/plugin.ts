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
  setTypes,
  setI18n,
  setCapabilities,
  setHttp,
  setIndexPatterns,
  setSavedObjects,
  setUsageCollector,
  setFilterManager,
} from './services';
import { VisualizeEmbeddableFactory } from '../../embeddable/visualize_embeddable_factory';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../embeddable';
import { ExpressionsSetup } from '../../../../../../plugins/expressions/public';
import { IEmbeddableSetup } from '../../../../../../plugins/embeddable/public';
import { visualization as visualizationFunction } from './expressions/visualization_function';
import { visualization as visualizationRenderer } from './expressions/visualization_renderer';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../../plugins/data/public';
import { UsageCollectionSetup } from '../../../../../../plugins/usage_collection/public';
import {
  createSavedVisLoader,
  SavedObjectKibanaServicesWithVisualizations,
} from '../../saved_visualizations';
import { SavedVisualizations } from '../../../../kibana/public/visualize/np_ready/types';
import { VisImpl, VisImplConstructor } from './vis_impl';
import { showNewVisModal } from './wizard';
/**
 * Interface for this plugin's returned setup/start contracts.
 *
 * @public
 */
export interface VisualizationsSetup {
  types: TypesSetup;
}

export interface VisualizationsStart {
  types: TypesStart;
  getSavedVisualizationsLoader: () => SavedVisualizations;
  showNewVisModal: typeof showNewVisModal;
  Vis: VisImplConstructor;
}

export interface VisualizationsSetupDeps {
  expressions: ExpressionsSetup;
  embeddable: IEmbeddableSetup;
  usageCollection: UsageCollectionSetup;
  data: DataPublicPluginSetup;
}

export interface VisualizationsStartDeps {
  data: DataPublicPluginStart;
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
  private savedVisualizations?: SavedVisualizations;
  private savedVisualizationDependencies?: SavedObjectKibanaServicesWithVisualizations;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup,
    { expressions, embeddable, usageCollection, data }: VisualizationsSetupDeps
  ): VisualizationsSetup {
    setUISettings(core.uiSettings);
    setUsageCollector(usageCollection);

    expressions.registerFunction(visualizationFunction);
    expressions.registerRenderer(visualizationRenderer);

    const embeddableFactory = new VisualizeEmbeddableFactory(
      data.query.timefilter.timefilter,
      this.getSavedVisualizationsLoader
    );
    embeddable.registerEmbeddableFactory(VISUALIZE_EMBEDDABLE_TYPE, embeddableFactory);

    return {
      types: this.types.setup(),
    };
  }

  public start(core: CoreStart, { data }: VisualizationsStartDeps): VisualizationsStart {
    const types = this.types.start();
    setI18n(core.i18n);
    setTypes(types);
    setCapabilities(core.application.capabilities);
    setHttp(core.http);
    setSavedObjects(core.savedObjects);
    setIndexPatterns(data.indexPatterns);
    setFilterManager(data.query.filterManager);

    this.savedVisualizationDependencies = {
      savedObjectsClient: core.savedObjects.client,
      indexPatterns: data.indexPatterns,
      chrome: core.chrome,
      overlays: core.overlays,
      visualizationTypes: types,
    };

    return {
      types,
      getSavedVisualizationsLoader: () => this.getSavedVisualizationsLoader(),
      showNewVisModal,
      Vis: VisImpl,
    };
  }

  public stop() {
    this.types.stop();
  }

  private getSavedVisualizationsLoader = () => {
    if (!this.savedVisualizations) {
      this.savedVisualizations = createSavedVisLoader(this.savedVisualizationDependencies!);
    }
    return this.savedVisualizations;
  };
}
