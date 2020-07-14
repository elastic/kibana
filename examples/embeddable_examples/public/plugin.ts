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
  EmbeddableSetup,
  EmbeddableStart,
  CONTEXT_MENU_TRIGGER,
} from '../../../src/plugins/embeddable/public';
import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';
import {
  HelloWorldEmbeddableFactory,
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddableFactoryDefinition,
} from './hello_world';
import { TODO_EMBEDDABLE, TodoEmbeddableFactory, TodoEmbeddableFactoryDefinition } from './todo';

import {
  MULTI_TASK_TODO_EMBEDDABLE,
  MultiTaskTodoEmbeddableFactory,
  MultiTaskTodoEmbeddableFactoryDefinition,
} from './multi_task_todo';
import {
  SEARCHABLE_LIST_CONTAINER,
  SearchableListContainerFactoryDefinition,
  SearchableListContainerFactory,
} from './searchable_list_container';
import {
  LIST_CONTAINER,
  ListContainerFactoryDefinition,
  ListContainerFactory,
} from './list_container';
import { createSampleData } from './create_sample_data';
import { TODO_REF_EMBEDDABLE } from './todo/todo_ref_embeddable';
import {
  TodoRefEmbeddableFactory,
  TodoRefEmbeddableFactoryDefinition,
} from './todo/todo_ref_embeddable_factory';
import { ACTION_EDIT_BOOK, createEditBookAction } from './book/edit_book_action';
import { BookEmbeddable, BOOK_EMBEDDABLE } from './book/book_embeddable';
import {
  BookEmbeddableFactory,
  BookEmbeddableFactoryDefinition,
} from './book/book_embeddable_factory';
import { UiActionsStart } from '../../../src/plugins/ui_actions/public';

export interface EmbeddableExamplesSetupDependencies {
  embeddable: EmbeddableSetup;
  uiActions: UiActionsStart;
}

export interface EmbeddableExamplesStartDependencies {
  embeddable: EmbeddableStart;
}

interface ExampleEmbeddableFactories {
  getHelloWorldEmbeddableFactory: () => HelloWorldEmbeddableFactory;
  getMultiTaskTodoEmbeddableFactory: () => MultiTaskTodoEmbeddableFactory;
  getSearchableListContainerEmbeddableFactory: () => SearchableListContainerFactory;
  getListContainerEmbeddableFactory: () => ListContainerFactory;
  getTodoEmbeddableFactory: () => TodoEmbeddableFactory;
  getTodoRefEmbeddableFactory: () => TodoRefEmbeddableFactory;
  getBookEmbeddableFactory: () => BookEmbeddableFactory;
}

export interface EmbeddableExamplesStart {
  createSampleData: () => Promise<void>;
  factories: ExampleEmbeddableFactories;
}

declare module '../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_EDIT_BOOK]: { embeddable: BookEmbeddable };
  }
}

export class EmbeddableExamplesPlugin
  implements
    Plugin<
      void,
      EmbeddableExamplesStart,
      EmbeddableExamplesSetupDependencies,
      EmbeddableExamplesStartDependencies
    > {
  private exampleEmbeddableFactories: Partial<ExampleEmbeddableFactories> = {};

  public setup(
    core: CoreSetup<EmbeddableExamplesStartDependencies>,
    deps: EmbeddableExamplesSetupDependencies
  ) {
    this.exampleEmbeddableFactories.getHelloWorldEmbeddableFactory = deps.embeddable.registerEmbeddableFactory(
      HELLO_WORLD_EMBEDDABLE,
      new HelloWorldEmbeddableFactoryDefinition()
    );

    this.exampleEmbeddableFactories.getMultiTaskTodoEmbeddableFactory = deps.embeddable.registerEmbeddableFactory(
      MULTI_TASK_TODO_EMBEDDABLE,
      new MultiTaskTodoEmbeddableFactoryDefinition()
    );

    this.exampleEmbeddableFactories.getSearchableListContainerEmbeddableFactory = deps.embeddable.registerEmbeddableFactory(
      SEARCHABLE_LIST_CONTAINER,
      new SearchableListContainerFactoryDefinition(async () => ({
        embeddableServices: (await core.getStartServices())[1].embeddable,
      }))
    );

    this.exampleEmbeddableFactories.getListContainerEmbeddableFactory = deps.embeddable.registerEmbeddableFactory(
      LIST_CONTAINER,
      new ListContainerFactoryDefinition(async () => ({
        embeddableServices: (await core.getStartServices())[1].embeddable,
      }))
    );

    this.exampleEmbeddableFactories.getTodoEmbeddableFactory = deps.embeddable.registerEmbeddableFactory(
      TODO_EMBEDDABLE,
      new TodoEmbeddableFactoryDefinition(async () => ({
        openModal: (await core.getStartServices())[0].overlays.openModal,
      }))
    );

    this.exampleEmbeddableFactories.getTodoRefEmbeddableFactory = deps.embeddable.registerEmbeddableFactory(
      TODO_REF_EMBEDDABLE,
      new TodoRefEmbeddableFactoryDefinition(async () => ({
        savedObjectsClient: (await core.getStartServices())[0].savedObjects.client,
        getEmbeddableFactory: (await core.getStartServices())[1].embeddable.getEmbeddableFactory,
      }))
    );
    this.exampleEmbeddableFactories.getBookEmbeddableFactory = deps.embeddable.registerEmbeddableFactory(
      BOOK_EMBEDDABLE,
      new BookEmbeddableFactoryDefinition(async () => ({
        getAttributeService: (await core.getStartServices())[1].embeddable.getAttributeService,
        openModal: (await core.getStartServices())[0].overlays.openModal,
      }))
    );

    const editBookAction = createEditBookAction(async () => ({
      getAttributeService: (await core.getStartServices())[1].embeddable.getAttributeService,
      openModal: (await core.getStartServices())[0].overlays.openModal,
    }));
    deps.uiActions.registerAction(editBookAction);
    deps.uiActions.attachAction(CONTEXT_MENU_TRIGGER, editBookAction.id);
  }

  public start(
    core: CoreStart,
    deps: EmbeddableExamplesStartDependencies
  ): EmbeddableExamplesStart {
    return {
      createSampleData: () => createSampleData(core.savedObjects.client),
      factories: this.exampleEmbeddableFactories as ExampleEmbeddableFactories,
    };
  }

  public stop() {}
}
