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

import { i18n } from '@kbn/i18n';
import {
  IContainer,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '../../../../src/plugins/embeddable/public';
import {
  MultiTaskTodoEmbeddable,
  MULTI_TASK_TODO_EMBEDDABLE,
  MultiTaskTodoInput,
  MultiTaskTodoOutput,
} from './multi_task_todo_embeddable';

export type MultiTaskTodoEmbeddableFactory = EmbeddableFactory<
  MultiTaskTodoInput,
  MultiTaskTodoOutput,
  MultiTaskTodoEmbeddable
>;

export class MultiTaskTodoEmbeddableFactoryDefinition
  implements
    EmbeddableFactoryDefinition<MultiTaskTodoInput, MultiTaskTodoOutput, MultiTaskTodoEmbeddable> {
  public readonly type = MULTI_TASK_TODO_EMBEDDABLE;

  public async isEditable() {
    return true;
  }

  public async create(initialInput: MultiTaskTodoInput, parent?: IContainer) {
    return new MultiTaskTodoEmbeddable(initialInput, parent);
  }

  /**
   * Check out todo_embeddable_factory for a better example that asks for data from
   * the user. This just returns default data.  That's okay too though, if you want to
   * start with default data and expose an "edit" action to modify it.
   */
  public async getExplicitInput() {
    return { title: 'default title', tasks: ['Im default data'] };
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.multiTaskTodo.displayName', {
      defaultMessage: 'Multi-task todo item',
    });
  }
}
