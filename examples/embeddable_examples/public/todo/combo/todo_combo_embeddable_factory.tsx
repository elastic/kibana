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
import { SavedObjectsClientContract, OverlayStart } from 'kibana/public';
import { TodoSavedObjectAttributes } from 'examples/embeddable_examples/common';
import React from 'react';
import { EuiConfirmModal } from '@elastic/eui';
import {
  IContainer,
  EmbeddableStart,
  ErrorEmbeddable,
  EmbeddableFactoryDefinition,
} from '../../../../../src/plugins/embeddable/public';
import {
  TodoComboInput,
  TodoComboOutput,
  TodoComboEmbeddable,
  TODO_COMBO_EMBEDDABLE,
} from './todo_combo_embeddable';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';

interface StartServices {
  getEmbeddableFactory: EmbeddableStart['getEmbeddableFactory'];
  savedObjectsClient: SavedObjectsClientContract;
  openModal: OverlayStart['openModal'];
}

export class TodoComboEmbeddableFactory
  implements
    EmbeddableFactoryDefinition<
      TodoComboInput,
      TodoComboOutput,
      TodoComboEmbeddable,
      TodoSavedObjectAttributes
    > {
  public readonly type = TODO_COMBO_EMBEDDABLE;
  public readonly savedObjectMetaData = {
    name: 'todo_Combo',
    includeFields: ['task', 'icon', 'title'],
    type: 'todo_Combo',
    getIconForSavedObject: () => 'pencil',
  };

  private elasticSourceCode = [
    'Home',
    'Dinner',
    'Space',
    'Time',
    'IT Depends',
    'Progress',
    'SIMPLICITY',
    'Perfection',
    'FORMAT',
    'HUMILITY',
    'Ambition',
    'Speed',
    'Scale',
    'Relevance',
  ];

  private getASourceCodeWord(): string {
    return this.elasticSourceCode[
      Math.floor(Math.random() * Math.floor(this.elasticSourceCode.length))
    ];
  }

  private makeAFunTask(): string {
    const tasks = [];
    const taskLength = Math.floor(Math.random() * Math.floor(2) + 1);
    for (let i = 0; i < taskLength; i++) {
      tasks.push(` ${this.getASourceCodeWord()} my ${this.getASourceCodeWord()}`);
    }
    return `I gotta ${tasks.join(', then ')}`;
  }

  constructor(private getStartServices: () => Promise<StartServices>) {}

  public async isEditable() {
    return true;
  }

  public async getExplicitInput(): Promise<Partial<TodoComboInput>> {
    const task = this.makeAFunTask();
    const title = task.split(', then')[0].replace('I gotta', '');
    const attributes: TodoSavedObjectAttributes = {
      title,
      task,
      icon: 'pencil',
    };
    const { openModal, savedObjectsClient } = await this.getStartServices();
    return new Promise<Partial<TodoComboInput>>(resolve => {
      const byRef = async () => {
        const savedObject = await savedObjectsClient.create(this.type, attributes);
        resolve({
          savedObjectId: savedObject.id,
        });
      };
      const byVal = async () => {
        resolve({
          ...attributes,
        });
      };
      const overlay = openModal(
        toMountPoint(
          <EuiConfirmModal
            title="By reference or by val???"
            onCancel={() => {
              byRef();
              overlay.close();
            }}
            onConfirm={() => {
              byVal();
              overlay.close();
            }}
            cancelButtonText="by reference"
            confirmButtonText="by val"
            defaultFocusedButton="confirm"
          >
            <p>You&rsquo;re about to do something.</p>
            <p>Are you sure you want to do this?</p>
          </EuiConfirmModal>
        )
      );
    });
  }

  public createFromSavedObject = (
    savedObjectId: string,
    input: TodoComboInput & { id: string },
    parent?: IContainer
  ): Promise<TodoComboEmbeddable | ErrorEmbeddable> => {
    // no special treatment for embeddables based on savedObjects in this example
    return this.create(input, parent);
  };

  public async create(
    input: TodoComboInput,
    parent?: IContainer
  ): Promise<TodoComboEmbeddable | ErrorEmbeddable> {
    const { savedObjectsClient } = await this.getStartServices();
    return new TodoComboEmbeddable(input, {
      parent,
      savedObjectsClient,
    });
  }

  public getDisplayName() {
    return i18n.translate('embeddableExamples.todo.displayName', {
      defaultMessage: 'Todo (by reference or value)',
    });
  }
}
