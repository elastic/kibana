/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsFindOptionsReference } from 'kibana/public';
import {
  setUISettings,
  setTypes,
  setApplication,
  setCapabilities,
  setHttp,
  setSearch,
  setSavedObjects,
  setUsageCollector,
  setExpressions,
  setUiActions,
  setTimeFilter,
  setAggs,
  setChrome,
  setOverlays,
  setEmbeddable,
  setDocLinks,
  setSpaces,
  setTheme,
} from './services';
import {
  VISUALIZE_EMBEDDABLE_TYPE,
  VisualizeEmbeddableFactory,
  createVisEmbeddableFromObject,
} from './embeddable';
import type { SpacesPluginStart } from '../../../../x-pack/plugins/spaces/public';
import { TypesService } from './vis_types/types_service';
import { range as rangeExpressionFunction } from '../common/expression_functions/range';
import { visDimension as visDimensionExpressionFunction } from '../common/expression_functions/vis_dimension';
import { xyDimension as xyDimensionExpressionFunction } from '../common/expression_functions/xy_dimension';

import { createStartServicesGetter, StartServicesGetter } from '../../kibana_utils/public';
import type { SerializedVis, Vis } from './vis';
import { showNewVisModal } from './wizard';

import {
  convertFromSerializedVis,
  convertToSerializedVis,
  getSavedVisualization,
  saveVisualization,
  findListItems,
} from './utils/saved_visualize_utils';

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  ApplicationStart,
  SavedObjectsClientContract,
} from '../../../core/public';
import type { UsageCollectionSetup } from '../../usage_collection/public';
import type { UiActionsStart } from '../../ui_actions/public';
import type { SavedObjectsStart } from '../../saved_objects/public';
import type { TypesSetup, TypesStart } from './vis_types';
import type {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '../../../plugins/inspector/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '../../../plugins/data/public';
import type { ExpressionsSetup, ExpressionsStart } from '../../expressions/public';
import type { EmbeddableSetup, EmbeddableStart } from '../../embeddable/public';
import type { SavedObjectTaggingOssPluginStart } from '../../saved_objects_tagging_oss/public';
import { createVisAsync } from './vis_async';
import type { VisSavedObject, SaveVisOptions, GetVisOptions } from './types';

/**
 * Interface for this plugin's returned setup/start contracts.
 *
 * @public
 */

export type VisualizationsSetup = TypesSetup;

export interface VisualizationsStart extends TypesStart {
  createVis: (visType: string, visState: SerializedVis) => Promise<Vis>;
  convertToSerializedVis: typeof convertToSerializedVis;
  convertFromSerializedVis: typeof convertFromSerializedVis;
  showNewVisModal: typeof showNewVisModal;
  getSavedVisualization: (opts?: GetVisOptions | string) => Promise<VisSavedObject>;
  saveVisualization: (savedVis: VisSavedObject, saveOptions: SaveVisOptions) => Promise<string>;
  findListItems: (
    searchTerm: string,
    listingLimit: number,
    references?: SavedObjectsFindOptionsReference[]
  ) => Promise<{ hits: Array<Record<string, unknown>>; total: number }>;
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
  spaces?: SpacesPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
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
    >
{
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
    setTheme(core.theme);

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
    {
      data,
      expressions,
      uiActions,
      embeddable,
      savedObjects,
      spaces,
      savedObjectsTaggingOss,
    }: VisualizationsStartDeps
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

    if (spaces) {
      setSpaces(spaces);
    }

    return {
      ...types,
      showNewVisModal,
      getSavedVisualization: async (opts) => {
        return getSavedVisualization(
          {
            search: data.search,
            savedObjectsClient: core.savedObjects.client,
            dataViews: data.dataViews,
            spaces,
            savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
          },
          opts
        );
      },
      saveVisualization: async (savedVis, saveOptions) => {
        return saveVisualization(savedVis, saveOptions, {
          savedObjectsClient: core.savedObjects.client,
          overlays: core.overlays,
          savedObjectsTagging: savedObjectsTaggingOss?.getTaggingApi(),
        });
      },
      findListItems: async (searchTerm, listingLimit, references) => {
        return findListItems(core.savedObjects.client, types, searchTerm, listingLimit, references);
      },
      /**
       * creates new instance of Vis
       * @param {IndexPattern} indexPattern - index pattern to use
       * @param {VisState} visState - visualization configuration
       */
      createVis: async (visType: string, visState: SerializedVis) =>
        await createVisAsync(visType, visState),
      convertToSerializedVis,
      convertFromSerializedVis,
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
