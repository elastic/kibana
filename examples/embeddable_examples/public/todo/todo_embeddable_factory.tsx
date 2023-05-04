/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { EuiModalBody } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { OverlayStart } from '@kbn/core/public';
import { EuiFieldText } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import {
  IContainer,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { TodoEmbeddable, TODO_EMBEDDABLE, TodoInput, TodoOutput } from './todo_embeddable';

function TaskInput({ onSave }: { onSave: (task: string) => void }) {
  const [task, setTask] = useState('');
  return (
    <EuiModalBody>
      <EuiFieldText
        data-test-subj="taskInputField"
        value={task}
        placeholder="Enter task here"
        onChange={(e) => setTask(e.target.value)}
      />
      <EuiButton data-test-subj="createTodoEmbeddable" onClick={() => onSave(task)}>
        Save
      </EuiButton>
    </EuiModalBody>
  );
}

interface StartServices {
  openModal: OverlayStart['openModal'];
}

export type TodoEmbeddableFactory = EmbeddableFactory<TodoInput, TodoOutput, TodoEmbeddable>;

export class TodoEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<TodoInput, TodoOutput, TodoEmbeddable>
{
  public readonly type = TODO_EMBEDDABLE;

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public async isEditable() {
    return true;
  }

  public async create(initialInput: TodoInput, parent?: IContainer) {
    return new TodoEmbeddable(initialInput, parent);
  }

  /**
   * This function is used when dynamically creating a new embeddable to add to a
   * container. Some input may be inherited from the container, but not all. This can be
   * used to collect specific embeddable input that the container will not provide, like
   * in this case, the task string.
   */
  public getExplicitInput = async () => {
    const { openModal } = await this.getStartServices();
    return new Promise<{ task: string }>((resolve) => {
      const onSave = (task: string) => resolve({ task });
      const overlay = openModal(
        toMountPoint(
          <TaskInput
            onSave={(task: string) => {
              onSave(task);
              overlay.close();
            }}
          />
        )
      );
    });
  };

  public getDisplayName() {
    return i18n.translate('embeddableExamples.todo.displayName', {
      defaultMessage: 'Todo item',
    });
  }
}
