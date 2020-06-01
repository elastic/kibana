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
import { BookSavedObjectAttributes, BOOK_SAVED_OBJECT } from '../../common';
import { createAction } from '../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { ViewMode } from '../../../../src/plugins/embeddable/public';
import { BookEmbeddable, BOOK_EMBEDDABLE, BookByReferenceInput } from './book_embeddable';
import { CreateEditBookComponent } from './create_edit_book_component';

interface StartServices {
  openModal: OverlayStart['openModal'];
  savedObjectsClient: SavedObjectsClientContract;
}

interface ActionContext {
  embeddable: BookEmbeddable;
}

export const ACTION_EDIT_BOOK = 'ACTION_EDIT_BOOK';

export const createEditBookAction = (getStartServices: () => Promise<StartServices>) =>
  createAction({
    getDisplayName: () =>
      i18n.translate('embeddableExamples.book.edit', { defaultMessage: 'Edit' }),
    type: ACTION_EDIT_BOOK,
    isCompatible: async ({ embeddable }: ActionContext) => {
      return (
        embeddable.type === BOOK_EMBEDDABLE && embeddable.getInput().viewMode === ViewMode.EDIT
      );
    },
    execute: async ({ embeddable }: ActionContext) => {
      const { openModal, savedObjectsClient } = await getStartServices();
      const onSave = async (attributes: BookSavedObjectAttributes, includeInLibrary: boolean) => {
        if (includeInLibrary) {
          // const input = embeddable.getInput() as BookByReferenceInput;

          if ((embeddable.getInput() as BookByReferenceInput).savedObjectId) {
            await savedObjectsClient.update(
              BOOK_SAVED_OBJECT,
              (embeddable.getInput() as BookByReferenceInput).savedObjectId!,
              attributes
            );
            embeddable.updateInput({ attributes: undefined });
            embeddable.reload();
          } else {
            const savedItem = await savedObjectsClient.create(BOOK_SAVED_OBJECT, attributes);
            embeddable.updateInput({ savedObjectId: savedItem.id });
          }
        } else {
          embeddable.updateInput({ attributes });
        }
      };
      const overlay = openModal(
        toMountPoint(
          <CreateEditBookComponent
            savedObjectId={(embeddable.getInput() as BookByReferenceInput).savedObjectId}
            attributes={embeddable.getOutput().savedAttributes}
            onSave={(attributes: BookSavedObjectAttributes, includeInLibrary: boolean) => {
              overlay.close();
              onSave(attributes, includeInLibrary);
            }}
          />
        )
      );
    },
  });
