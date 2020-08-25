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
import { OverlayStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { BookSavedObjectAttributes, BOOK_SAVED_OBJECT } from '../../common';
import { createAction } from '../../../../src/plugins/ui_actions/public';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { ViewMode, SavedObjectEmbeddableInput } from '../../../../src/plugins/embeddable/public';
import {
  BookEmbeddable,
  BOOK_EMBEDDABLE,
  BookByReferenceInput,
  BookByValueInput,
} from './book_embeddable';
import { CreateEditBookComponent } from './create_edit_book_component';
import { DashboardStart } from '../../../../src/plugins/dashboard/public';

interface StartServices {
  openModal: OverlayStart['openModal'];
  getAttributeService: DashboardStart['getAttributeService'];
}

interface ActionContext {
  embeddable: BookEmbeddable;
}

export const ACTION_EDIT_BOOK = 'ACTION_EDIT_BOOK';

export const createEditBookAction = (getStartServices: () => Promise<StartServices>) =>
  createAction({
    getDisplayName: () =>
      i18n.translate('embeddableExamples.book.edit', { defaultMessage: 'Edit Book' }),
    type: ACTION_EDIT_BOOK,
    order: 100,
    getIconType: () => 'documents',
    isCompatible: async ({ embeddable }: ActionContext) => {
      return (
        embeddable.type === BOOK_EMBEDDABLE && embeddable.getInput().viewMode === ViewMode.EDIT
      );
    },
    execute: async ({ embeddable }: ActionContext) => {
      const { openModal, getAttributeService } = await getStartServices();
      const attributeService = getAttributeService<
        BookSavedObjectAttributes,
        BookByValueInput,
        BookByReferenceInput
      >(BOOK_SAVED_OBJECT);
      const onSave = async (attributes: BookSavedObjectAttributes, useRefType: boolean) => {
        const newInput = await attributeService.wrapAttributes(attributes, useRefType, embeddable);
        if (!useRefType && (embeddable.getInput() as SavedObjectEmbeddableInput).savedObjectId) {
          // Set the saved object ID to null so that update input will remove the existing savedObjectId...
          (newInput as BookByValueInput & { savedObjectId: unknown }).savedObjectId = null;
        }
        embeddable.updateInput(newInput);
        if (useRefType) {
          // Ensures that any duplicate embeddables also register the changes. This mirrors the behavior of going back and forth between apps
          embeddable.getRoot().reload();
        }
      };
      const overlay = openModal(
        toMountPoint(
          <CreateEditBookComponent
            savedObjectId={(embeddable.getInput() as BookByReferenceInput).savedObjectId}
            attributes={embeddable.getOutput().attributes}
            onSave={(attributes: BookSavedObjectAttributes, useRefType: boolean) => {
              overlay.close();
              onSave(attributes, useRefType);
            }}
          />
        )
      );
    },
  });
