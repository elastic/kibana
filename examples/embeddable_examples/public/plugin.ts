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

import { IEmbeddableSetup, IEmbeddableStart } from '../../../src/plugins/embeddable/public';
import { Plugin, CoreSetup, CoreStart } from '../../../src/core/public';
import { HelloWorldEmbeddableFactory, HELLO_WORLD_EMBEDDABLE } from './hello_world';
import { TODO_EMBEDDABLE, TodoEmbeddableFactory } from './todo';
import { MULTI_TASK_TODO_EMBEDDABLE, MultiTaskTodoEmbeddableFactory } from './multi_task_todo';
import {
  SEARCHABLE_LIST_CONTAINER,
  SearchableListContainerFactory,
} from './searchable_list_container';
import { LIST_CONTAINER, ListContainerFactory } from './list_container';

interface EmbeddableExamplesSetupDependencies {
  embeddable: IEmbeddableSetup;
}

interface EmbeddableExamplesStartDependencies {
  embeddable: IEmbeddableStart;
}

export class EmbeddableExamplesPlugin
  implements
    Plugin<void, void, EmbeddableExamplesSetupDependencies, EmbeddableExamplesStartDependencies> {
  public setup(core: CoreSetup, deps: EmbeddableExamplesSetupDependencies) {
    deps.embeddable.registerEmbeddableFactory(
      HELLO_WORLD_EMBEDDABLE,
      new HelloWorldEmbeddableFactory()
    );

    deps.embeddable.registerEmbeddableFactory(TODO_EMBEDDABLE, new TodoEmbeddableFactory());

    deps.embeddable.registerEmbeddableFactory(
      MULTI_TASK_TODO_EMBEDDABLE,
      new MultiTaskTodoEmbeddableFactory()
    );
  }

  public start(core: CoreStart, deps: EmbeddableExamplesStartDependencies) {
    deps.embeddable.registerEmbeddableFactory(
      SEARCHABLE_LIST_CONTAINER,
      new SearchableListContainerFactory(deps.embeddable.getEmbeddableFactory)
    );

    deps.embeddable.registerEmbeddableFactory(
      LIST_CONTAINER,
      new ListContainerFactory(deps.embeddable.getEmbeddableFactory)
    );
  }

  public stop() {}
}
