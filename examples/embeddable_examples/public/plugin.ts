/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  EmbeddableSetup,
  EmbeddableStart,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ServerlessPluginStart } from '@kbn/serverless/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';

import {
  HelloWorldEmbeddableFactory,
  HelloWorldEmbeddableFactoryDefinition,
  HELLO_WORLD_EMBEDDABLE,
} from './hello_world';

import {
  ListContainerFactory,
  ListContainerFactoryDefinition,
  LIST_CONTAINER,
} from './list_container';

import {
  FilterDebuggerEmbeddableFactory,
  FilterDebuggerEmbeddableFactoryDefinition,
  FILTER_DEBUGGER_EMBEDDABLE,
} from './filter_debugger';
import {
  SimpleEmbeddableFactory,
  SimpleEmbeddableFactoryDefinition,
  SIMPLE_EMBEDDABLE,
} from './migrations';
import { EUI_MARKDOWN_ID } from './react_embeddables/eui_markdown/constants';
import { registerCreateEuiMarkdownAction } from './react_embeddables/eui_markdown/create_eui_markdown_action';
import { FIELD_LIST_ID } from './react_embeddables/field_list/constants';
import { registerCreateFieldListAction } from './react_embeddables/field_list/create_field_list_action';
import { SEARCH_EMBEDDABLE_ID } from './react_embeddables/search/constants';
import { registerAddSearchPanelAction } from './react_embeddables/search/register_add_search_panel_action';

export interface EmbeddableExamplesSetupDependencies {
  embeddable: EmbeddableSetup;
  uiActions: UiActionsStart;
}

export interface EmbeddableExamplesStartDependencies {
  dataViews: DataViewsPublicPluginStart;
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  fieldFormats: FieldFormatsStart;
}

interface ExampleEmbeddableFactories {
  getHelloWorldEmbeddableFactory: () => HelloWorldEmbeddableFactory;
  getListContainerEmbeddableFactory: () => ListContainerFactory;
  getMigrationsEmbeddableFactory: () => SimpleEmbeddableFactory;
  getFilterDebuggerEmbeddableFactory: () => FilterDebuggerEmbeddableFactory;
}

export interface EmbeddableExamplesStart {
  createSampleData: () => Promise<void>;
  factories: ExampleEmbeddableFactories;
}

export class EmbeddableExamplesPlugin
  implements
    Plugin<
      void,
      EmbeddableExamplesStart,
      EmbeddableExamplesSetupDependencies,
      EmbeddableExamplesStartDependencies
    >
{
  private exampleEmbeddableFactories: Partial<ExampleEmbeddableFactories> = {};

  public setup(
    core: CoreSetup<EmbeddableExamplesStartDependencies>,
    deps: EmbeddableExamplesSetupDependencies
  ) {
    this.exampleEmbeddableFactories.getHelloWorldEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        HELLO_WORLD_EMBEDDABLE,
        new HelloWorldEmbeddableFactoryDefinition()
      );

    this.exampleEmbeddableFactories.getMigrationsEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        SIMPLE_EMBEDDABLE,
        new SimpleEmbeddableFactoryDefinition()
      );

    this.exampleEmbeddableFactories.getListContainerEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        LIST_CONTAINER,
        new ListContainerFactoryDefinition(async () => ({
          embeddableServices: (await core.getStartServices())[1].embeddable,
        }))
      );

    this.exampleEmbeddableFactories.getFilterDebuggerEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        FILTER_DEBUGGER_EMBEDDABLE,
        new FilterDebuggerEmbeddableFactoryDefinition()
      );
  }

  public start(
    core: CoreStart,
    deps: EmbeddableExamplesStartDependencies
  ): EmbeddableExamplesStart {
    registerCreateFieldListAction(deps.uiActions);
    registerReactEmbeddableFactory(FIELD_LIST_ID, async () => {
      const { getFieldListFactory } = await import(
        './react_embeddables/field_list/field_list_react_embeddable'
      );
      return getFieldListFactory(core, deps);
    });

    registerCreateEuiMarkdownAction(deps.uiActions);
    registerReactEmbeddableFactory(EUI_MARKDOWN_ID, async () => {
      const { markdownEmbeddableFactory } = await import(
        './react_embeddables/eui_markdown/eui_markdown_react_embeddable'
      );
      return markdownEmbeddableFactory;
    });

    registerAddSearchPanelAction(deps.uiActions);
    registerReactEmbeddableFactory(SEARCH_EMBEDDABLE_ID, async () => {
      const { getSearchEmbeddableFactory } = await import(
        './react_embeddables/search/search_react_embeddable'
      );
      return getSearchEmbeddableFactory(deps);
    });

    return {
      createSampleData: async () => {},
      factories: this.exampleEmbeddableFactories as ExampleEmbeddableFactories,
    };
  }

  public stop() {}
}
