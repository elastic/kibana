/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DashboardStart } from '@kbn/dashboard-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import {
  EmbeddableSetup,
  EmbeddableStart,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { setupApp } from './app/setup_app';
import { DATA_TABLE_ID } from './react_embeddables/data_table/constants';
import { registerCreateDataTableAction } from './react_embeddables/data_table/create_data_table_action';
import { EUI_MARKDOWN_ID } from './react_embeddables/eui_markdown/constants';
import { registerCreateEuiMarkdownAction } from './react_embeddables/eui_markdown/create_eui_markdown_action';
import { registerCreateFieldListAction } from './react_embeddables/field_list/create_field_list_action';
import { FIELD_LIST_ID } from './react_embeddables/field_list/constants';
import { registerFieldListPanelPlacementSetting } from './react_embeddables/field_list/register_field_list_embeddable';
import { registerAddSearchPanelAction } from './react_embeddables/search/register_add_search_panel_action';
import { registerSearchEmbeddable } from './react_embeddables/search/register_search_embeddable';

export interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
  embeddable: EmbeddableSetup;
  uiActions: UiActionsStart;
}

export interface StartDeps {
  dataViews: DataViewsPublicPluginStart;
  dataViewFieldEditor: DataViewFieldEditorStart;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
  dashboard: DashboardStart;
}

export class EmbeddableExamplesPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, { embeddable, developerExamples }: SetupDeps) {
    setupApp(core, developerExamples);
  }

  public start(core: CoreStart, deps: StartDeps) {
    registerCreateFieldListAction(deps.uiActions);
    registerReactEmbeddableFactory(FIELD_LIST_ID, async () => {
      const { getFieldListFactory } = await import(
        './react_embeddables/field_list/field_list_react_embeddable'
      );
      return getFieldListFactory(core, deps);
    });
    registerFieldListPanelPlacementSetting(deps.dashboard);

    registerCreateEuiMarkdownAction(deps.uiActions);
    registerReactEmbeddableFactory(EUI_MARKDOWN_ID, async () => {
      const { markdownEmbeddableFactory } = await import(
        './react_embeddables/eui_markdown/eui_markdown_react_embeddable'
      );
      return markdownEmbeddableFactory;
    });

    registerAddSearchPanelAction(deps.uiActions);
    registerSearchEmbeddable(deps);

    registerCreateDataTableAction(deps.uiActions);
    registerReactEmbeddableFactory(DATA_TABLE_ID, async () => {
      const { getDataTableFactory } = await import(
        './react_embeddables/data_table/data_table_react_embeddable'
      );
      return getDataTableFactory(core, deps);
    });
  }

  public stop() {}
}
