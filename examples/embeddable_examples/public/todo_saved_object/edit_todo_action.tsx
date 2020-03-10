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
import React from 'react';
import { OverlayStart, SavedObjectsClientContract } from 'kibana/public';
import { TodoSavedObjectAttributes } from 'examples/embeddable_examples/common';
import { ActionType, createAction } from '../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { ViewMode } from '../../../../src/plugins/embeddable/public';
import { CreateEditTodoComponent } from './create_edit_todo_component';
import { TodoSoEmbeddable, TODO_SO_EMBEDDABLE } from './todo_so_embeddable';

interface StartServices {
  openModal: OverlayStart['openModal'];
  savedObjectsClient: SavedObjectsClientContract;
}

interface ActionContext {
  embeddable: TodoSoEmbeddable;
}

export const EDIT_TODO_ACTION = 'EDIT_TODO_ACTION' as ActionType;

export const createEditTodoAction = (getStartServices: () => Promise<StartServices>) =>
  createAction({
    getDisplayName: () => 'Edit todo item',
    type: EDIT_TODO_ACTION,
    isCompatible: async ({ embeddable }: ActionContext) => {
      return (
        embeddable.type === TODO_SO_EMBEDDABLE && embeddable.getInput().viewMode === ViewMode.EDIT
      );
    },
    execute: async ({ embeddable }: ActionContext) => {
      const { openModal, savedObjectsClient } = await getStartServices();
      const onSave = async (attributes: TodoSavedObjectAttributes, includeInLibrary: boolean) => {
        if (includeInLibrary) {
          if (embeddable.getInput().savedObjectId) {
            await savedObjectsClient.update(
              'todo',
              embeddable.getInput().savedObjectId!,
              attributes
            );
            embeddable.updateInput({ attributes });
            embeddable.reload();
          } else {
            const savedItem = await savedObjectsClient.create('todo', attributes);
            embeddable.updateInput({ savedObjectId: savedItem.id });
          }
        } else {
          embeddable.updateInput({ attributes });
        }
      };
      const overlay = openModal(
        toMountPoint(
          <CreateEditTodoComponent
            savedObjectId={embeddable.getInput().savedObjectId}
            attributes={embeddable.getInput().attributes}
            onSave={(attributes: TodoSavedObjectAttributes, includeInLibrary: boolean) => {
              onSave(attributes, includeInLibrary);
              overlay.close();
            }}
          />
        )
      );
    },
  });
