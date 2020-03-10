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

import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { Start as InspectorStart } from 'src/plugins/inspector/public';
import {
  EmbeddableSetup,
  EmbeddableStart,
  EmbeddableOutput,
  CONTEXT_MENU_TRIGGER,
} from '../../../src/plugins/embeddable/public';
import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';
import { HelloWorldEmbeddableFactory, HELLO_WORLD_EMBEDDABLE } from './hello_world';
import {
  TODO_SO_EMBEDDABLE,
  TodoSoEmbeddableFactory,
  TodoSoEmbeddableInput,
  createEditTodoAction,
  TodoSoEmbeddable,
  EDIT_TODO_ACTION,
} from './todo_saved_object';
import { TODO_EMBEDDABLE, TodoEmbeddableFactory, TodoInput, TodoOutput } from './todo';

import {
  MULTI_TASK_TODO_EMBEDDABLE,
  MultiTaskTodoEmbeddableFactory,
  MultiTaskTodoInput,
  MultiTaskTodoOutput,
} from './multi_task_todo';
import {
  SEARCHABLE_LIST_CONTAINER,
  SearchableListContainerFactory,
} from './searchable_list_container';
import { LIST_CONTAINER, ListContainerFactory } from './list_container';
import { createSampleData } from './create_sample_data';
import { StartServices } from './list_container/list_container_factory';
import {
  createSaveListContainerAction,
  ACTION_SAVE_LIST_CONTAINER,
  SaveListContainerActionContext,
} from './searchable_list_container/save_list_container_action';
import {
  createCheckReferencesAction,
  CheckRefsActionContext,
  ACTION_CHECK_SO_REFERENCES,
} from './actions';

export interface EmbeddableExamplesSetupDependencies {
  embeddable: EmbeddableSetup;
  uiActions: UiActionsStart;
}

export interface EmbeddableExamplesStartDependencies {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  inspector: InspectorStart;
}

export interface EmbeddableExamplesStart {
  createSampleData: (overwrite: boolean) => Promise<void>;
}

declare module '../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [EDIT_TODO_ACTION]: { embeddable: TodoSoEmbeddable };
    [ACTION_CHECK_SO_REFERENCES]: CheckRefsActionContext;
    [ACTION_SAVE_LIST_CONTAINER]: SaveListContainerActionContext;
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
  public setup(
    core: CoreSetup<EmbeddableExamplesStartDependencies>,
    deps: EmbeddableExamplesSetupDependencies
  ) {
    deps.embeddable.registerEmbeddableFactory(
      HELLO_WORLD_EMBEDDABLE,
      new HelloWorldEmbeddableFactory()
    );

    deps.embeddable.registerEmbeddableFactory<MultiTaskTodoInput, MultiTaskTodoOutput>(
      MULTI_TASK_TODO_EMBEDDABLE,
      new MultiTaskTodoEmbeddableFactory()
    );

    deps.embeddable.registerEmbeddableFactory<TodoInput, TodoOutput>(
      TODO_EMBEDDABLE,
      new TodoEmbeddableFactory(async () => ({
        openModal: (await core.getStartServices())[0].overlays.openModal,
      }))
    );

    deps.embeddable.registerEmbeddableFactory(
      SEARCHABLE_LIST_CONTAINER,
      new SearchableListContainerFactory(async () => ({
        getEmbeddableFactory: (await core.getStartServices())[1].embeddable.getEmbeddableFactory,
        getAllEmbeddableFactories: (await core.getStartServices())[1].embeddable
          .getEmbeddableFactories,
        uiActionsApi: (await core.getStartServices())[1].uiActions,
        inspector: (await core.getStartServices())[1].inspector,
        uiSettingsClient: (await core.getStartServices())[0].uiSettings,
        notifications: (await core.getStartServices())[0].notifications,
        overlays: (await core.getStartServices())[0].overlays,
        savedObject: (await core.getStartServices())[0].savedObjects,
      }))
    );

    deps.embeddable.registerEmbeddableFactory(
      LIST_CONTAINER,
      new ListContainerFactory(
        async (): Promise<StartServices> => ({
          getEmbeddableFactory: (await core.getStartServices())[1].embeddable.getEmbeddableFactory,
          getAllEmbeddableFactories: (await core.getStartServices())[1].embeddable
            .getEmbeddableFactories,
          uiActionsApi: (await core.getStartServices())[1].uiActions,
          inspector: (await core.getStartServices())[1].inspector,
          uiSettingsClient: (await core.getStartServices())[0].uiSettings,
          notifications: (await core.getStartServices())[0].notifications,
          overlays: (await core.getStartServices())[0].overlays,
          savedObject: (await core.getStartServices())[0].savedObjects,
        })
      )
    );

    /**
     * This embeddable is a version of the Todo embeddable, but one that is backed, optionally,
     * off a saved object.
     */
    deps.embeddable.registerEmbeddableFactory<TodoSoEmbeddableInput, EmbeddableOutput>(
      TODO_SO_EMBEDDABLE,
      new TodoSoEmbeddableFactory(async () => ({
        openModal: (await core.getStartServices())[0].overlays.openModal,
        savedObjectsClient: (await core.getStartServices())[0].savedObjects.client,
        getEmbeddableFactory: (await core.getStartServices())[1].embeddable.getEmbeddableFactory,
      }))
    );

    const editTodoAction = createEditTodoAction(async () => ({
      openModal: (await core.getStartServices())[0].overlays.openModal,
      savedObjectsClient: (await core.getStartServices())[0].savedObjects.client,
      getEmbeddableFactory: (await core.getStartServices())[1].embeddable.getEmbeddableFactory,
    }));
    deps.uiActions.registerAction(editTodoAction);
    deps.uiActions.attachAction(CONTEXT_MENU_TRIGGER, editTodoAction);

    const saveListContainer = createSaveListContainerAction(async () => ({
      savedObjectsClient: (await core.getStartServices())[0].savedObjects.client,
    }));
    deps.uiActions.registerAction(saveListContainer);
    deps.uiActions.attachAction(CONTEXT_MENU_TRIGGER, saveListContainer);

    const checkRefsAction = createCheckReferencesAction(async () => ({
      openModal: (await core.getStartServices())[0].overlays.openModal,
    }));
    deps.uiActions.registerAction(checkRefsAction);
    deps.uiActions.attachAction(CONTEXT_MENU_TRIGGER, checkRefsAction);
  }

  public start(core: CoreStart, deps: EmbeddableExamplesStartDependencies) {
    return {
      createSampleData: (overwrite: boolean) =>
        createSampleData(core.savedObjects.client, overwrite),
    };
  }

  public stop() {}
}
