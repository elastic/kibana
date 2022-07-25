/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  IContainer,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
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
    EmbeddableFactoryDefinition<MultiTaskTodoInput, MultiTaskTodoOutput, MultiTaskTodoEmbeddable>
{
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
