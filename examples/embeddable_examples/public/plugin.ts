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

import { EmbeddableSetup, EmbeddableStart } from '../../../src/plugins/embeddable/public';
import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';
import { HelloWorldEmbeddableFactory, HELLO_WORLD_EMBEDDABLE } from './hello_world';
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
import { TodoRefInput, TodoRefOutput, TODO_REF_EMBEDDABLE } from './todo/todo_ref_embeddable';
import { TodoRefEmbeddableFactory } from './todo/todo_ref_embeddable_factory';

export interface EmbeddableExamplesSetupDependencies {
  embeddable: EmbeddableSetup;
}

export interface EmbeddableExamplesStartDependencies {
  embeddable: EmbeddableStart;
}

export interface EmbeddableExamplesStart {
  createSampleData: () => Promise<void>;
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

    deps.embeddable.registerEmbeddableFactory(
      SEARCHABLE_LIST_CONTAINER,
      new SearchableListContainerFactory(async () => ({
        embeddableServices: (await core.getStartServices())[1].embeddable,
      }))
    );

    deps.embeddable.registerEmbeddableFactory(
      LIST_CONTAINER,
      new ListContainerFactory(async () => ({
        embeddableServices: (await core.getStartServices())[1].embeddable,
      }))
    );

    deps.embeddable.registerEmbeddableFactory<TodoInput, TodoOutput>(
      TODO_EMBEDDABLE,
      new TodoEmbeddableFactory(async () => ({
        openModal: (await core.getStartServices())[0].overlays.openModal,
      }))
    );

    deps.embeddable.registerEmbeddableFactory<TodoRefInput, TodoRefOutput>(
      TODO_REF_EMBEDDABLE,
      new TodoRefEmbeddableFactory(async () => ({
        savedObjectsClient: (await core.getStartServices())[0].savedObjects.client,
        getEmbeddableFactory: (await core.getStartServices())[1].embeddable.getEmbeddableFactory,
      }))
    );
  }

  public start(core: CoreStart, deps: EmbeddableExamplesStartDependencies) {
    return {
      createSampleData: () => createSampleData(core.savedObjects.client),
    };
  }

  public stop() {}
}
