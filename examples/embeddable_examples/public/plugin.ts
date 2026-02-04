/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type {
  ContentManagementPublicSetup,
  ContentManagementPublicStart,
} from '@kbn/content-management-plugin/public';
import type { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { setupApp } from './app/setup_app';
import { ADD_DATA_TABLE_ACTION_ID, DATA_TABLE_ID } from './react_embeddables/data_table/constants';
import { FIELD_LIST_ID } from './react_embeddables/field_list/constants';
import { ADD_SAVED_BOOK_ACTION_ID } from './react_embeddables/saved_book/constants';
import { ADD_FIELD_LIST_ACTION_ID } from './react_embeddables/field_list/constants';
import { registerFieldListPanelPlacementSetting } from './react_embeddables/field_list/register_field_list_embeddable';
import { registerSearchEmbeddable } from './react_embeddables/search/register_search_embeddable';
import { setKibanaServices } from './kibana_services';
import { setupBookEmbeddable } from './react_embeddables/saved_book/setup_book_embeddable';
import { registerSearchPanelAction } from './react_embeddables/search/register_search_panel_action';

export interface SetupDeps {
  contentManagement: ContentManagementPublicSetup;
  developerExamples: DeveloperExamplesSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
}

export interface StartDeps {
  contentManagement: ContentManagementPublicStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewFieldEditor: DataViewFieldEditorStart;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
  dashboard: DashboardStart;
  presentationUtil: PresentationUtilPluginStart;
}

export class EmbeddableExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(
    core: CoreSetup<StartDeps>,
    { contentManagement, embeddable, developerExamples }: SetupDeps
  ) {
    setupApp(core, developerExamples);

    const startServicesPromise = core.getStartServices();

    embeddable.registerReactEmbeddableFactory(FIELD_LIST_ID, async () => {
      const { getFieldListFactory } = await import(
        './react_embeddables/field_list/field_list_embeddable'
      );
      const [coreStart, deps] = await startServicesPromise;
      return getFieldListFactory(coreStart, deps);
    });

    embeddable.registerReactEmbeddableFactory(DATA_TABLE_ID, async () => {
      const { getDataTableFactory } = await import(
        './react_embeddables/data_table/data_table_react_embeddable'
      );
      const [coreStart, deps] = await startServicesPromise;
      return getDataTableFactory(coreStart, deps);
    });

    setupBookEmbeddable(core, embeddable, contentManagement);

    registerSearchEmbeddable(
      embeddable,
      new Promise((resolve) => startServicesPromise.then(([_, startDeps]) => resolve(startDeps)))
    );
  }

  public start(core: CoreStart, deps: StartDeps) {
    setKibanaServices(core, deps);

    deps.uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_FIELD_LIST_ACTION_ID, async () => {
      const { createFieldListAction } = await import(
        './react_embeddables/field_list/create_field_list_action'
      );
      return createFieldListAction;
    });

    registerFieldListPanelPlacementSetting(deps.presentationUtil);
    registerSearchPanelAction(deps.uiActions);
    deps.uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_DATA_TABLE_ACTION_ID, async () => {
      const { createDataTableAction } = await import(
        './react_embeddables/data_table/create_data_table_action'
      );
      return createDataTableAction;
    });

    deps.uiActions.addTriggerActionAsync(ADD_PANEL_TRIGGER, ADD_SAVED_BOOK_ACTION_ID, async () => {
      const { createSavedBookAction } = await import(
        './react_embeddables/saved_book/create_saved_book_action'
      );
      return createSavedBookAction(core);
    });
  }

  public stop() {}
}
