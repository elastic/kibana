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
import { SavedObject } from 'ui/saved_objects/types';
import { SavedObjectsClientContract, SimpleSavedObject } from 'kibana/public';
import { findObjectByTitle } from 'ui/saved_objects';
import { SAVE_DUPLICATE_REJECTED } from 'ui/saved_objects/constants';
import { displayDuplicateTitleConfirmModal } from 'ui/saved_objects/helpers/display_duplicate_title_confirm_modal';

export const checkForDuplicateTitle = (
  savedObject: SavedObject,
  savedObjectsClient: SavedObjectsClientContract,
  isTitleDuplicateConfirmed: boolean,
  onTitleDuplicate: (() => void) | undefined
) => {
  // Don't check for duplicates if user has already confirmed save with duplicate title
  if (isTitleDuplicateConfirmed) {
    return Promise.resolve(true);
  }

  // Don't check if the user isn't updating the title, otherwise that would become very annoying to have
  // to confirm the save every time, except when copyOnSave is true, then we do want to check.
  if (savedObject.title === savedObject.lastSavedTitle && !savedObject.copyOnSave) {
    return Promise.resolve(true);
  }

  return findObjectByTitle(savedObjectsClient, savedObject.getEsType(), savedObject.title).then(
    (duplicate: SimpleSavedObject<any> | void) => {
      if (!duplicate) return true;
      if (duplicate.id === savedObject.id) return true;

      if (onTitleDuplicate) {
        onTitleDuplicate();
        return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
      }

      // TODO: make onTitleDuplicate a required prop and remove UI components from this class
      // Need to leave here until all users pass onTitleDuplicate.
      return displayDuplicateTitleConfirmModal(savedObject);
    }
  );
};
