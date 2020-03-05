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

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../../../core/public';
import { TypesService, TypesSetup, TypesStart } from './vis_types';
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
  setExpressions,
  setUiActions,
  setSavedVisualizationsLoader,
  setTimeFilter,
  setAggs,
} from './services';
import { VISUALIZE_EMBEDDABLE_TYPE, VisualizeEmbeddableFactory } from './embeddable';
import { ExpressionsSetup, ExpressionsStart } from '../../../../../../plugins/expressions/public';
import { IEmbeddableSetup } from '../../../../../../plugins/embeddable/public';
import { visualization as visualizationFunction } from './expressions/visualization_function';
import { visualization as visualizationRenderer } from './expressions/visualization_renderer';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../../plugins/data/public';
import { UsageCollectionSetup } from '../../../../../../plugins/usage_collection/public';
import { createSavedVisLoader, SavedVisualizationsLoader } from './saved_visualizations';
import { VisImpl, VisImplConstructor } from './vis_impl';
import { showNewVisModal } from './wizard';
import { UiActionsStart } from '../../../../../../plugins/ui_actions/public';
import { DataStart as LegacyDataStart } from '../../../../data/public';

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
  savedVisualizationsLoader: SavedVisualizationsLoader;
  Vis: VisImplConstructor;
  showNewVisModal: typeof showNewVisModal;
}

export interface VisualizationsSetupDeps {
  expressions: ExpressionsSetup;
  embeddable: IEmbeddableSetup;
  usageCollection: UsageCollectionSetup;
  data: DataPublicPluginSetup;
}

export interface VisualizationsStartDeps {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  uiActions: UiActionsStart;
  __LEGACY: {
    aggs: LegacyDataStart['search']['aggs'];
  };
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

  public setup(
    core: CoreSetup,
    { expressions, embeddable, usageCollection, data }: VisualizationsSetupDeps
  ): VisualizationsSetup {
    setUISettings(core.uiSettings);
    setUsageCollector(usageCollection);

    expressions.registerFunction(visualizationFunction);
    expressions.registerRenderer(visualizationRenderer);

    const embeddableFactory = new VisualizeEmbeddableFactory();
    embeddable.registerEmbeddableFactory(VISUALIZE_EMBEDDABLE_TYPE, embeddableFactory);

    return {
      types: this.types.setup(),
    };
  }

  public start(
    core: CoreStart,
    { data, expressions, uiActions, __LEGACY: { aggs } }: VisualizationsStartDeps
  ): VisualizationsStart {
    const types = this.types.start();
    setI18n(core.i18n);
    setTypes(types);
    setCapabilities(core.application.capabilities);
    setHttp(core.http);
    setSavedObjects(core.savedObjects);
    setIndexPatterns(data.indexPatterns);
    setFilterManager(data.query.filterManager);
    setExpressions(expressions);
    setUiActions(uiActions);
    setTimeFilter(data.query.timefilter.timefilter);
    setAggs(aggs);
    const savedVisualizationsLoader = createSavedVisLoader({
      savedObjectsClient: core.savedObjects.client,
      indexPatterns: data.indexPatterns,
      chrome: core.chrome,
      overlays: core.overlays,
      visualizationTypes: types,
    });
    setSavedVisualizationsLoader(savedVisualizationsLoader);

    return {
      types,
      showNewVisModal,
      Vis: VisImpl,
      savedVisualizationsLoader,
    };
  }

  public stop() {
    this.types.stop();
  }
}
