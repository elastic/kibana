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
import { i18n } from '@kbn/i18n';
import { NoteSavedObjectAttributes, NOTE_SAVED_OBJECT } from '../common';
import { createAction } from '../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { ViewMode } from '../../../../src/plugins/embeddable/public';
import { CreateEditNoteComponent } from './create_edit_note_component';
import { NoteEmbeddable, NOTE_EMBEDDABLE } from './note_embeddable';

interface StartServices {
  openModal: OverlayStart['openModal'];
  savedObjectsClient: SavedObjectsClientContract;
}

interface ActionContext {
  embeddable: NoteEmbeddable;
}

export const ACTION_EDIT_NOTE = 'ACTION_EDIT_NOTE';

export const createEditNoteAction = (getStartServices: () => Promise<StartServices>) =>
  createAction({
    getDisplayName: () =>
      i18n.translate('embeddableExamples.note.edit', { defaultMessage: 'Edit' }),
    type: ACTION_EDIT_NOTE,
    isCompatible: async ({ embeddable }: ActionContext) => {
      return (
        embeddable.type === NOTE_EMBEDDABLE && embeddable.getInput().viewMode === ViewMode.EDIT
      );
    },
    execute: async ({ embeddable }: ActionContext) => {
      const { openModal, savedObjectsClient } = await getStartServices();
      const onSave = async (attributes: NoteSavedObjectAttributes, includeInLibrary: boolean) => {
        if (includeInLibrary) {
          if (embeddable.getInput().savedObjectId) {
            await savedObjectsClient.update(
              NOTE_SAVED_OBJECT,
              embeddable.getInput().savedObjectId!,
              attributes
            );
            embeddable.updateInput({ attributes: undefined });
            embeddable.reload();
          } else {
            const savedItem = await savedObjectsClient.create(NOTE_SAVED_OBJECT, attributes);
            embeddable.updateInput({ savedObjectId: savedItem.id });
          }
        } else {
          embeddable.updateInput({ attributes });
        }
      };
      const overlay = openModal(
        toMountPoint(
          <CreateEditNoteComponent
            savedObjectId={embeddable.getInput().savedObjectId}
            attributes={embeddable.getInput().attributes ?? embeddable.getOutput().savedAttributes}
            onSave={(attributes: NoteSavedObjectAttributes, includeInLibrary: boolean) => {
              overlay.close();
              onSave(attributes, includeInLibrary);
            }}
          />
        )
      );
    },
  });
