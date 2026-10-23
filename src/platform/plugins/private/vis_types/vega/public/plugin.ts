/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  combineLatest,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  ReplaySubject,
  take,
  type Subscription,
} from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { Plugin as ExpressionsPublicPlugin } from '@kbn/expressions-plugin/public';
import type { DataPublicPluginSetup, DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type {
  BasicVisualizationClient,
  VisTypeAlias,
  VisualizationsSetup,
} from '@kbn/visualizations-plugin/public';
import type {
  Setup as InspectorSetup,
  Start as InspectorStart,
} from '@kbn/inspector-plugin/public';

import type { MapsEmsPluginPublicStart } from '@kbn/maps-ems-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { SavedObjectTaggingOssPluginStart } from '@kbn/saved-objects-tagging-oss-plugin/public';
import {
  ADD_CANVAS_ELEMENT_TRIGGER,
  ADD_PANEL_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import {
  setNotifications,
  setData,
  setDataViews,
  setInjectedVars,
  setThemeService,
  setDocLinks,
  setMapsEms,
  setUsageCollectionStart,
  setHttp,
} from './services';

import type { IServiceSettings } from './vega_view/vega_map_view/service_settings/service_settings_types';

import type { ConfigSchema } from '../server/config';
import type { VegaByReferenceState } from '../server';

import { getVegaInspectorView } from './vega_inspector/vega_inspector';
import { getServiceSettingsLazy } from './vega_view/vega_map_view/service_settings/get_service_settings_lazy';
import {
  VEGA_API_ENABLED_FLAG,
  VEGA_EMBEDDABLE_TYPE,
  VEGA_SAVED_OBJECT_TYPE,
  VEGA_STANDALONE_EMBEDDABLE_FLAG,
} from '../common/constants';
import { ADD_VEGA_EMBEDDABLE_ACTION_ID, ADD_VEGA_PANEL_ACTION_ID } from './constants';
import { getVegaVisualizationClient } from './library/vega_library_client';
import { VegaIcon, vegaTitleInWizard } from './vega_icon';

/** @internal */
export interface VegaVisualizationDependencies {
  core: CoreSetup;
  plugins: {
    data: DataPublicPluginSetup;
  };
  getServiceSettings: () => Promise<IServiceSettings>;
}

/** @internal */
export interface VegaPluginSetupDependencies {
  embeddable: EmbeddableSetup;
  expressions: ReturnType<ExpressionsPublicPlugin['setup']>;
  visualizations: VisualizationsSetup;
  inspector: InspectorSetup;
  data: DataPublicPluginSetup;
}

/** @internal */
export interface VegaPluginStartDependencies {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  expressions: ReturnType<ExpressionsPublicPlugin['start']>;
  mapsEms: MapsEmsPluginPublicStart;
  dataViews: DataViewsPublicPluginStart;
  uiActions: UiActionsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  savedObjectsTaggingOss?: SavedObjectTaggingOssPluginStart;
  usageCollection: UsageCollectionStart;
  inspector: InspectorStart;
}

/** @internal */
export class VegaPlugin implements Plugin<void, void> {
  initializerContext: PluginInitializerContext<ConfigSchema>;
  private standaloneEmbeddableFlagSubscription?: Subscription;
  private libraryFlagsSubscription?: Subscription;
  private libraryAliasSubscription?: Subscription;
  private addFromLibrarySubscription?: Subscription;
  /**
   * Whether dashboard panels can use Vega library items: both the standalone embeddable and the
   * library API must be enabled. Emits once `start` has read the flags.
   */
  private readonly isLibraryEnabled$ = new ReplaySubject<boolean>(1);
  private registerLibraryAlias?: () => void;
  private registerAddFromLibrary?: () => void;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    core: CoreSetup<VegaPluginStartDependencies>,
    { embeddable, inspector, data, expressions, visualizations }: VegaPluginSetupDependencies
  ) {
    setInjectedVars({
      enableExternalUrls: this.initializerContext.config.get().enableExternalUrls,
    });

    const visualizationDependencies: Readonly<VegaVisualizationDependencies> = {
      core,
      plugins: {
        data,
      },
      getServiceSettings: getServiceSettingsLazy,
    };

    inspector.registerView(getVegaInspectorView({ uiSettings: core.uiSettings }));

    // Resolves when the editor closes.
    const openLibraryEditor = async (id: string) => {
      const [[coreStart, startDeps], { openVegaLibraryEditor }] = await Promise.all([
        core.getStartServices(),
        import('./library/open_vega_library_editor'),
      ]);
      await openVegaLibraryEditor({ core: coreStart, deps: startDeps, id });
    };

    visualizations.createBaseVisualizationAsync('vega', async () => {
      const [[, startPlugins], { vegaVisType, createVegaFn, getVegaVisRenderer }] =
        await Promise.all([core.getStartServices(), import('./async_module')]);
      if (!startPlugins.expressions.getFunction('vega')) {
        expressions.registerFunction(() => createVegaFn(visualizationDependencies));
        expressions.registerRenderer(getVegaVisRenderer(visualizationDependencies));
      }
      return vegaVisType;
    });

    // Lists Vega library items in the Visualize library next to legacy Vega visualizations.
    const libraryAlias: VisTypeAlias = {
      name: 'vegaLibrary',
      title: vegaTitleInWizard,
      icon: 'visualizeApp',
      description: i18n.translate('visTypeVega.libraryAlias.description', {
        defaultMessage: 'Use the Vega syntax to create new types of visualizations.',
        description: 'Vega and Vega-Lite are product names and should not be translated',
      }),
      stage: 'production',
      disableCreate: true,
      appExtensions: {
        visualizations: {
          docTypes: [VEGA_SAVED_OBJECT_TYPE],
          searchFields: ['title^3', 'description'],
          client: (_contentManagement, http) =>
            getVegaVisualizationClient(http) as BasicVisualizationClient,
          toListItem: ({ id, type, attributes, updatedAt, managed }) => ({
            id,
            title: attributes.title,
            description: attributes.description,
            updatedAt,
            managed,
            icon: 'visualizeApp',
            typeTitle: vegaTitleInWizard,
            stage: 'production',
            savedObjectType: type,
            editor: { onEdit: openLibraryEditor },
          }),
        },
      },
    };

    // Registered in `start`, once the feature flag can be read.
    this.registerLibraryAlias = () => visualizations.registerAlias(libraryAlias);

    embeddable.registerEmbeddablePublicDefinition(VEGA_EMBEDDABLE_TYPE, async () => {
      const [[startCore, startDeps], { vegaEmbeddableFactory }] = await Promise.all([
        core.getStartServices(),
        import('./embeddable/vega_embeddable'),
      ]);
      return vegaEmbeddableFactory(startCore, {
        uiActions: startDeps.uiActions,
        SearchBar: startDeps.unifiedSearch.ui.SearchBar,
        visualizationDependencies,
        libraryEditorDependencies: startDeps,
        // Taken once per panel, so the panel library actions match the server schema.
        isLibraryEnabled: await firstValueFrom(this.isLibraryEnabled$),
      });
    });

    // Registered in `start`, once the feature flags can be read.
    this.registerAddFromLibrary = () =>
      embeddable.registerAddFromLibraryType({
        onAdd: (container, savedObject) => {
          container.addNewPanel<VegaByReferenceState>(
            { panelType: VEGA_EMBEDDABLE_TYPE, serializedState: { ref_id: savedObject.id } },
            { displaySuccessMessage: true }
          );
        },
        savedObjectType: VEGA_SAVED_OBJECT_TYPE,
        savedObjectName: vegaTitleInWizard,
        getIconForSavedObject: () => VegaIcon,
      });
  }

  public start(core: CoreStart, deps: VegaPluginStartDependencies) {
    setNotifications(core.notifications);
    setHttp(core.http);
    setData(deps.data);
    setDataViews(deps.dataViews);
    setDocLinks(core.docLinks);
    setMapsEms(deps.mapsEms);
    setThemeService(core.theme);
    setUsageCollectionStart(deps.usageCollection);

    const apiEnabled$ = core.featureFlags.getBooleanValue$(VEGA_API_ENABLED_FLAG, false);

    this.libraryFlagsSubscription = combineLatest([
      core.featureFlags.getBooleanValue$(VEGA_STANDALONE_EMBEDDABLE_FLAG, false),
      apiEnabled$,
    ])
      .pipe(
        map(
          ([standaloneEmbeddableEnabled, apiEnabled]) => standaloneEmbeddableEnabled && apiEnabled
        ),
        distinctUntilChanged()
      )
      .subscribe(this.isLibraryEnabled$);

    // Without the flag, the Visualize listing shouldn't query the library API.
    this.libraryAliasSubscription = apiEnabled$
      .pipe(filter(Boolean), take(1))
      .subscribe(() => this.registerLibraryAlias?.());

    // Library items can only be added as panels once the standalone embeddable is enabled too.
    this.addFromLibrarySubscription = this.isLibraryEnabled$
      .pipe(filter(Boolean), take(1))
      .subscribe(() => this.registerAddFromLibrary?.());

    deps.uiActions.registerActionAsync(ADD_VEGA_PANEL_ACTION_ID, async () => {
      const { getAddVegaPanelAction } = await import('./add_vega_panel_action');
      return getAddVegaPanelAction(deps);
    });

    // The embeddable definition is always registered (see setup) so existing Vega panels keep
    // rendering even after a flag rollback.
    deps.uiActions.registerActionAsync(ADD_VEGA_EMBEDDABLE_ACTION_ID, async () => {
      const { getAddVegaEmbeddableAction } = await import(
        './embeddable/add_vega_embeddable_action'
      );
      return getAddVegaEmbeddableAction(core);
    });

    // The feature flag swaps both Dashboard and Canvas from legacy Visualize action to the
    // standalone embeddable action.
    this.standaloneEmbeddableFlagSubscription = core.featureFlags
      .getBooleanValue$(VEGA_STANDALONE_EMBEDDABLE_FLAG, false)
      .pipe(distinctUntilChanged())
      .subscribe((useEmbeddableAction) => {
        const [actionToAttach, actionToDetach] = useEmbeddableAction
          ? [ADD_VEGA_EMBEDDABLE_ACTION_ID, ADD_VEGA_PANEL_ACTION_ID]
          : [ADD_VEGA_PANEL_ACTION_ID, ADD_VEGA_EMBEDDABLE_ACTION_ID];

        for (const trigger of [ADD_PANEL_TRIGGER, ADD_CANVAS_ELEMENT_TRIGGER]) {
          deps.uiActions.attachAction(trigger, actionToAttach);
          deps.uiActions.detachAction(trigger, actionToDetach);
        }
      });
  }

  public stop() {
    this.standaloneEmbeddableFlagSubscription?.unsubscribe();
    this.libraryFlagsSubscription?.unsubscribe();
    this.libraryAliasSubscription?.unsubscribe();
    this.addFromLibrarySubscription?.unsubscribe();
  }
}
