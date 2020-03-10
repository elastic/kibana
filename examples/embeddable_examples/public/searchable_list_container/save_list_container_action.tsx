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
import { SavedObjectsClientContract } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { createAction } from '../../../../src/plugins/ui_actions/public';
import { ViewMode } from '../../../../src/plugins/embeddable/public';
import { SEARCHABLE_LIST_CONTAINER, SearchableListContainer } from './searchable_list_container';

interface StartServices {
  savedObjectsClient: SavedObjectsClientContract;
}

export interface SaveListContainerActionContext {
  embeddable: SearchableListContainer;
}

export const ACTION_SAVE_LIST_CONTAINER = 'ACTION_SAVE_LIST_CONTAINER';

export const createSaveListContainerAction = (getStartServices: () => Promise<StartServices>) =>
  createAction({
    getDisplayName: () =>
      i18n.translate('embeddableExamples.listContainer.save', { defaultMessage: 'Save changes' }),
    type: ACTION_SAVE_LIST_CONTAINER,
    isCompatible: async ({ embeddable }) => {
      return (
        embeddable.type === SEARCHABLE_LIST_CONTAINER &&
        embeddable.getInput().viewMode === ViewMode.EDIT &&
        embeddable.isDirty()
      );
    },
    execute: async ({ embeddable }) => {
      const { savedObjectsClient } = await getStartServices();
      const { savedObjectId, panels, title } = embeddable.getInput();
      if (savedObjectId) {
        await savedObjectsClient.update('todo', embeddable.getInput().savedObjectId!, {
          panels,
          title,
        });
        embeddable.reload();
      } else {
        const savedItem = await savedObjectsClient.create('todo', { panels, title });
        embeddable.updateInput({ savedObjectId: savedItem.id });
      }
    },
  });
