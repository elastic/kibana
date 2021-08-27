/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup, CoreStart } from '../../../core/public';
import type { ApplicationStart } from '../../../core/public/application/types';
import type { Plugin } from '../../../core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import type { SavedObjectsClientContract } from '../../../core/public/saved_objects/saved_objects_client';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '../../data/public/types';
import { createSavedSearchesLoader } from '../../discover/public/saved_searches/saved_searches';
import type { EmbeddableSetup, EmbeddableStart } from '../../embeddable/public/plugin';
import type { ExpressionsSetup, ExpressionsStart } from '../../expressions/public/plugin';
import type {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '../../inspector/public/plugin';
import type { StartServicesGetter } from '../../kibana_utils/public/core/create_start_service_getter';
import { createStartServicesGetter } from '../../kibana_utils/public/core/create_start_service_getter';
import type { SavedObjectsStart } from '../../saved_objects/public/plugin';
import type { UiActionsStart } from '../../ui_actions/public/plugin';
import type { UsageCollectionSetup } from '../../usage_collection/public/plugin';
import { range as rangeExpressionFunction } from '../common/expression_functions/range';
import { visDimension as visDimensionExpressionFunction } from '../common/expression_functions/vis_dimension';
import { xyDimension as xyDimensionExpressionFunction } from '../common/expression_functions/xy_dimension';
import { VISUALIZE_EMBEDDABLE_TYPE } from './embeddable/constants';
import { createVisEmbeddableFromObject } from './embeddable/create_vis_embeddable_from_object';
import { VisualizeEmbeddableFactory } from './embeddable/visualize_embeddable_factory';
import type { SavedVisualizationsLoader } from './saved_visualizations/saved_visualizations';
import { createSavedVisLoader } from './saved_visualizations/saved_visualizations';
import {
  convertFromSerializedVis,
  convertToSerializedVis,
} from './saved_visualizations/_saved_vis';
import {
  setAggs,
  setApplication,
  setCapabilities,
  setChrome,
  setDocLinks,
  setEmbeddable,
  setExpressions,
  setHttp,
  setOverlays,
  setSavedObjects,
  setSavedSearchLoader,
  setSavedVisualizationsLoader,
  setSearch,
  setTimeFilter,
  setTypes,
  setUiActions,
  setUISettings,
  setUsageCollector,
} from './services';
import type { SerializedVis } from './vis';
import { Vis } from './vis';
import { createVisAsync } from './vis_async';
import type { TypesSetup, TypesStart } from './vis_types/types_service';
import { TypesService } from './vis_types/types_service';
import { showNewVisModal } from './wizard/show_new_vis';

/**
 * Interface for this plugin's returned setup/start contracts.
 *
 * @public
 */

export type VisualizationsSetup = TypesSetup;

export interface VisualizationsStart extends TypesStart {
  savedVisualizationsLoader: SavedVisualizationsLoader;
  createVis: (visType: string, visState: SerializedVis) => Promise<Vis>;
  convertToSerializedVis: typeof convertToSerializedVis;
  convertFromSerializedVis: typeof convertFromSerializedVis;
  showNewVisModal: typeof showNewVisModal;
  __LEGACY: { createVisEmbeddableFromObject: ReturnType<typeof createVisEmbeddableFromObject> };
}

export interface VisualizationsSetupDeps {
  data: DataPublicPluginSetup;
  embeddable: EmbeddableSetup;
  expressions: ExpressionsSetup;
  inspector: InspectorSetup;
  usageCollection: UsageCollectionSetup;
}

export interface VisualizationsStartDeps {
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStart;
  uiActions: UiActionsStart;
  application: ApplicationStart;
  getAttributeService: EmbeddableStart['getAttributeService'];
  savedObjects: SavedObjectsStart;
  savedObjectsClient: SavedObjectsClientContract;
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
  private getStartServicesOrDie?: StartServicesGetter<VisualizationsStartDeps, VisualizationsStart>;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(
    core: CoreSetup<VisualizationsStartDeps, VisualizationsStart>,
    { expressions, embeddable, usageCollection, data }: VisualizationsSetupDeps
  ): VisualizationsSetup {
    const start = (this.getStartServicesOrDie = createStartServicesGetter(core.getStartServices));

    setUISettings(core.uiSettings);
    setUsageCollector(usageCollection);

    expressions.registerFunction(rangeExpressionFunction);
    expressions.registerFunction(visDimensionExpressionFunction);
    expressions.registerFunction(xyDimensionExpressionFunction);
    const embeddableFactory = new VisualizeEmbeddableFactory({ start });
    embeddable.registerEmbeddableFactory(VISUALIZE_EMBEDDABLE_TYPE, embeddableFactory);

    return {
      ...this.types.setup(),
    };
  }

  public start(
    core: CoreStart,
    { data, expressions, uiActions, embeddable, savedObjects }: VisualizationsStartDeps
  ): VisualizationsStart {
    const types = this.types.start();
    setTypes(types);
    setEmbeddable(embeddable);
    setApplication(core.application);
    setCapabilities(core.application.capabilities);
    setHttp(core.http);
    setSavedObjects(core.savedObjects);
    setDocLinks(core.docLinks);
    setSearch(data.search);
    setExpressions(expressions);
    setUiActions(uiActions);
    setTimeFilter(data.query.timefilter.timefilter);
    setAggs(data.search.aggs);
    setOverlays(core.overlays);
    setChrome(core.chrome);
    const savedVisualizationsLoader = createSavedVisLoader({
      savedObjectsClient: core.savedObjects.client,
      indexPatterns: data.indexPatterns,
      savedObjects,
      visualizationTypes: types,
    });
    setSavedVisualizationsLoader(savedVisualizationsLoader);
    const savedSearchLoader = createSavedSearchesLoader({
      savedObjectsClient: core.savedObjects.client,
      savedObjects,
    });
    setSavedSearchLoader(savedSearchLoader);
    return {
      ...types,
      showNewVisModal,
      /**
       * creates new instance of Vis
       * @param {IndexPattern} indexPattern - index pattern to use
       * @param {VisState} visState - visualization configuration
       */
      createVis: async (visType: string, visState: SerializedVis) =>
        await createVisAsync(visType, visState),
      convertToSerializedVis,
      convertFromSerializedVis,
      savedVisualizationsLoader,
      __LEGACY: {
        createVisEmbeddableFromObject: createVisEmbeddableFromObject({
          start: this.getStartServicesOrDie!,
        }),
      },
    };
  }

  public stop() {
    this.types.stop();
  }
}
