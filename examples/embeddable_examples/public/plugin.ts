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
  CONTEXT_MENU_TRIGGER,
  EmbeddableFactory,
  EmbeddableSetup,
  EmbeddableStart,
} from '../../../src/plugins/embeddable/public';
import { CoreSetup, CoreStart, Plugin } from '../../../src/core/public';
import {
  HELLO_WORLD_EMBEDDABLE,
  HelloWorldEmbeddable,
  HelloWorldEmbeddableFactory,
  HelloWorldEmbeddableFactoryDefinition,
} from './hello_world';
import {
  TODO_EMBEDDABLE,
  TodoEmbeddable,
  TodoEmbeddableFactory,
  TodoEmbeddableFactoryDefinition,
} from './todo';
import {
  MULTI_TASK_TODO_EMBEDDABLE,
  MultiTaskTodoEmbeddable,
  MultiTaskTodoEmbeddableFactory,
  MultiTaskTodoEmbeddableFactoryDefinition,
} from './multi_task_todo';
import {
  SEARCHABLE_LIST_CONTAINER,
  SearchableListContainer,
  SearchableListContainerFactory,
  SearchableListContainerFactoryDefinition,
} from './searchable_list_container';
import {
  LIST_CONTAINER,
  ListContainer,
  ListContainerFactory,
  ListContainerFactoryDefinition,
} from './list_container';
import { createSampleData } from './create_sample_data';
import { TODO_REF_EMBEDDABLE, TodoRefEmbeddable } from './todo/todo_ref_embeddable';
import {
  TodoRefEmbeddableFactory,
  TodoRefEmbeddableFactoryDefinition,
} from './todo/todo_ref_embeddable_factory';
import { ACTION_EDIT_BOOK, createEditBookAction } from './book/edit_book_action';
import { BOOK_EMBEDDABLE, BookEmbeddable } from './book/book_embeddable';
import {
  BookEmbeddableFactory,
  BookEmbeddableFactoryDefinition,
} from './book/book_embeddable_factory';
import { UiActionsSetup } from '../../../src/plugins/ui_actions/public';

export interface EmbeddableExamplesSetupDependencies {
  embeddable: EmbeddableSetup;
  uiActions: UiActionsSetup;
}

export interface EmbeddableExamplesStartDependencies {
  embeddable: EmbeddableStart;
}

interface ExampleEmbeddableExports<Factory extends EmbeddableFactory, EmbeddableCtor> {
  type: Factory['type'];
  getFactory: () => Factory;
  embeddable: EmbeddableCtor;
}

export interface ExampleEmbeddables {
  helloWorld: ExampleEmbeddableExports<HelloWorldEmbeddableFactory, typeof HelloWorldEmbeddable>;
  multiTaskTodo: ExampleEmbeddableExports<
    MultiTaskTodoEmbeddableFactory,
    typeof MultiTaskTodoEmbeddable
  >;
  searchableList: ExampleEmbeddableExports<
    SearchableListContainerFactory,
    typeof SearchableListContainer
  >;
  list: ExampleEmbeddableExports<ListContainerFactory, typeof ListContainer>;
  todo: ExampleEmbeddableExports<TodoEmbeddableFactory, typeof TodoEmbeddable>;
  todoRef: ExampleEmbeddableExports<TodoRefEmbeddableFactory, typeof TodoRefEmbeddable>;
  book: ExampleEmbeddableExports<BookEmbeddableFactory, typeof BookEmbeddable>;
}

export interface EmbeddableExamplesStart {
  createSampleData: () => Promise<void>;
  embeddables: ExampleEmbeddables;
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
  private exampleEmbeddables: Partial<ExampleEmbeddables> = {};

  public setup(
    core: CoreSetup<EmbeddableExamplesStartDependencies>,
    deps: EmbeddableExamplesSetupDependencies
  ) {
    this.exampleEmbeddables.helloWorld = {
      type: HELLO_WORLD_EMBEDDABLE,
      getFactory: deps.embeddable.registerEmbeddableFactory(
        HELLO_WORLD_EMBEDDABLE,
        new HelloWorldEmbeddableFactoryDefinition()
      ),
      embeddable: HelloWorldEmbeddable,
    };

    this.exampleEmbeddables.multiTaskTodo = {
      type: MULTI_TASK_TODO_EMBEDDABLE,
      getFactory: deps.embeddable.registerEmbeddableFactory(
        MULTI_TASK_TODO_EMBEDDABLE,
        new MultiTaskTodoEmbeddableFactoryDefinition()
      ),
      embeddable: MultiTaskTodoEmbeddable,
    };

    this.exampleEmbeddables.searchableList = {
      type: SEARCHABLE_LIST_CONTAINER,
      getFactory: deps.embeddable.registerEmbeddableFactory(
        SEARCHABLE_LIST_CONTAINER,
        new SearchableListContainerFactoryDefinition(async () => ({
          embeddableServices: (await core.getStartServices())[1].embeddable,
        }))
      ),
      embeddable: SearchableListContainer,
    };

    this.exampleEmbeddables.list = {
      type: LIST_CONTAINER,
      getFactory: deps.embeddable.registerEmbeddableFactory(
        LIST_CONTAINER,
        new ListContainerFactoryDefinition(async () => ({
          embeddableServices: (await core.getStartServices())[1].embeddable,
        }))
      ),
      embeddable: ListContainer,
    };

    this.exampleEmbeddables.todo = {
      type: TODO_EMBEDDABLE,
      getFactory: deps.embeddable.registerEmbeddableFactory(
        TODO_EMBEDDABLE,
        new TodoEmbeddableFactoryDefinition(async () => ({
          openModal: (await core.getStartServices())[0].overlays.openModal,
        }))
      ),
      embeddable: TodoEmbeddable,
    };

    this.exampleEmbeddables.todoRef = {
      type: TODO_REF_EMBEDDABLE,
      getFactory: deps.embeddable.registerEmbeddableFactory(
        TODO_REF_EMBEDDABLE,
        new TodoRefEmbeddableFactoryDefinition(async () => ({
          savedObjectsClient: (await core.getStartServices())[0].savedObjects.client,
          getEmbeddableFactory: (await core.getStartServices())[1].embeddable.getEmbeddableFactory,
        }))
      ),
      embeddable: TodoRefEmbeddable,
    };

    this.exampleEmbeddables.book = {
      type: BOOK_EMBEDDABLE,
      getFactory: deps.embeddable.registerEmbeddableFactory(
        BOOK_EMBEDDABLE,
        new BookEmbeddableFactoryDefinition(async () => ({
          getAttributeService: (await core.getStartServices())[1].embeddable.getAttributeService,
          openModal: (await core.getStartServices())[0].overlays.openModal,
        }))
      ),
      embeddable: BookEmbeddable,
    };

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
      embeddables: this.exampleEmbeddables as ExampleEmbeddables,
    };
  }

  public stop() {}
}
