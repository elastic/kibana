/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import {
  HelloWorldEmbeddableFactory,
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddableFactoryDefinition,
} from './hello_world';

import {
  LIST_CONTAINER,
  ListContainerFactoryDefinition,
  ListContainerFactory,
} from './list_container';

import {
  SIMPLE_EMBEDDABLE,
  SimpleEmbeddableFactory,
  SimpleEmbeddableFactoryDefinition,
} from './migrations';
import {
  FILTER_DEBUGGER_EMBEDDABLE,
  FilterDebuggerEmbeddableFactory,
  FilterDebuggerEmbeddableFactoryDefinition,
} from './filter_debugger';
import { registerMarkdownEditorEmbeddable } from './react_embeddables/eui_markdown/eui_markdown_react_embeddable';
import { registerCreateEuiMarkdownAction } from './react_embeddables/eui_markdown/create_eui_markdown_action';
import { registerFieldListFactory } from './react_embeddables/field_list/field_list_react_embeddable';
import { registerCreateFieldListAction } from './react_embeddables/field_list/create_field_list_action';

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
    registerFieldListFactory(core, deps);
    registerCreateFieldListAction(deps.uiActions);

    registerMarkdownEditorEmbeddable();
    registerCreateEuiMarkdownAction(deps.uiActions);

    return {
      createSampleData: async () => {},
      factories: this.exampleEmbeddableFactories as ExampleEmbeddableFactories,
    };
  }

  public stop() {}
}
