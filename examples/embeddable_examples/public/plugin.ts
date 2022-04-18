/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableSetup,
  EmbeddableStart,
  CONTEXT_MENU_TRIGGER,
} from '@kbn/embeddable-plugin/public';
import { Plugin, CoreSetup, CoreStart, SavedObjectsClient } from '@kbn/core/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
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
import { createEditBookAction } from './book/edit_book_action';
import { BOOK_EMBEDDABLE } from './book/book_embeddable';
import {
  BookEmbeddableFactory,
  BookEmbeddableFactoryDefinition,
} from './book/book_embeddable_factory';
import { createAddBookToLibraryAction } from './book/add_book_to_library_action';
import { createUnlinkBookFromLibraryAction } from './book/unlink_book_from_library_action';
import {
  SIMPLE_EMBEDDABLE,
  SimpleEmbeddableFactory,
  SimpleEmbeddableFactoryDefinition,
} from './migrations';

export interface EmbeddableExamplesSetupDependencies {
  embeddable: EmbeddableSetup;
  uiActions: UiActionsStart;
}

export interface EmbeddableExamplesStartDependencies {
  embeddable: EmbeddableStart;
  savedObjectsClient: SavedObjectsClient;
}

interface ExampleEmbeddableFactories {
  getHelloWorldEmbeddableFactory: () => HelloWorldEmbeddableFactory;
  getMultiTaskTodoEmbeddableFactory: () => MultiTaskTodoEmbeddableFactory;
  getSearchableListContainerEmbeddableFactory: () => SearchableListContainerFactory;
  getListContainerEmbeddableFactory: () => ListContainerFactory;
  getTodoEmbeddableFactory: () => TodoEmbeddableFactory;
  getTodoRefEmbeddableFactory: () => TodoRefEmbeddableFactory;
  getBookEmbeddableFactory: () => BookEmbeddableFactory;
  getMigrationsEmbeddableFactory: () => SimpleEmbeddableFactory;
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

    this.exampleEmbeddableFactories.getMultiTaskTodoEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        MULTI_TASK_TODO_EMBEDDABLE,
        new MultiTaskTodoEmbeddableFactoryDefinition()
      );

    this.exampleEmbeddableFactories.getSearchableListContainerEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        SEARCHABLE_LIST_CONTAINER,
        new SearchableListContainerFactoryDefinition(async () => ({
          embeddableServices: (await core.getStartServices())[1].embeddable,
        }))
      );

    this.exampleEmbeddableFactories.getListContainerEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        LIST_CONTAINER,
        new ListContainerFactoryDefinition(async () => ({
          embeddableServices: (await core.getStartServices())[1].embeddable,
        }))
      );

    this.exampleEmbeddableFactories.getTodoEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        TODO_EMBEDDABLE,
        new TodoEmbeddableFactoryDefinition(async () => ({
          openModal: (await core.getStartServices())[0].overlays.openModal,
        }))
      );

    this.exampleEmbeddableFactories.getTodoRefEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        TODO_REF_EMBEDDABLE,
        new TodoRefEmbeddableFactoryDefinition(async () => ({
          savedObjectsClient: (await core.getStartServices())[0].savedObjects.client,
          getEmbeddableFactory: (await core.getStartServices())[1].embeddable.getEmbeddableFactory,
        }))
      );
    this.exampleEmbeddableFactories.getBookEmbeddableFactory =
      deps.embeddable.registerEmbeddableFactory(
        BOOK_EMBEDDABLE,
        new BookEmbeddableFactoryDefinition(async () => ({
          getAttributeService: (await core.getStartServices())[1].embeddable.getAttributeService,
          openModal: (await core.getStartServices())[0].overlays.openModal,
          savedObjectsClient: (await core.getStartServices())[0].savedObjects.client,
          overlays: (await core.getStartServices())[0].overlays,
        }))
      );

    const editBookAction = createEditBookAction(async () => ({
      getAttributeService: (await core.getStartServices())[1].embeddable.getAttributeService,
      openModal: (await core.getStartServices())[0].overlays.openModal,
      savedObjectsClient: (await core.getStartServices())[0].savedObjects.client,
    }));
    deps.uiActions.registerAction(editBookAction);
    deps.uiActions.attachAction(CONTEXT_MENU_TRIGGER, editBookAction.id);

    const addBookToLibraryAction = createAddBookToLibraryAction();
    deps.uiActions.registerAction(addBookToLibraryAction);
    deps.uiActions.attachAction(CONTEXT_MENU_TRIGGER, addBookToLibraryAction.id);

    const unlinkBookFromLibraryAction = createUnlinkBookFromLibraryAction();
    deps.uiActions.registerAction(unlinkBookFromLibraryAction);
    deps.uiActions.attachAction(CONTEXT_MENU_TRIGGER, unlinkBookFromLibraryAction.id);
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
