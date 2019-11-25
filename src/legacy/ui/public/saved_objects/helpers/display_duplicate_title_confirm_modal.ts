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
import { SAVE_DUPLICATE_REJECTED } from 'ui/saved_objects/constants';
import { SavedObject } from '../types';

export function displayDuplicateTitleConfirmModal(
  savedObject: SavedObject,
  confirmModalPromise: (
    message: string,
    options: { confirmButtonText: string }
  ) => Promise<React.Component>
) {
  const confirmMessage = i18n.translate(
    'common.ui.savedObjects.confirmModal.saveDuplicateConfirmationMessage',
    {
      defaultMessage: `A {name} with the title '{title}' already exists. Would you like to save anyway?`,
      values: { title: savedObject.title, name: savedObject.getDisplayName() },
    }
  );

  return confirmModalPromise(confirmMessage, {
    confirmButtonText: i18n.translate(
      'common.ui.savedObjects.confirmModal.saveDuplicateButtonLabel',
      {
        defaultMessage: 'Save {name}',
        values: { name: savedObject.getDisplayName() },
      }
    ),
  }).catch(() => Promise.reject(new Error(SAVE_DUPLICATE_REJECTED)));
}
