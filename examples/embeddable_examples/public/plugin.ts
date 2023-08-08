/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
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

export interface EmbeddableExamplesSetupDependencies {
  embeddable: EmbeddableSetup;
  uiActions: UiActionsStart;
}

export interface EmbeddableExamplesStartDependencies {
  embeddable: EmbeddableStart;
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
    return {
      createSampleData: async () => {},
      factories: this.exampleEmbeddableFactories as ExampleEmbeddableFactories,
    };
  }

  public stop() {}
}
