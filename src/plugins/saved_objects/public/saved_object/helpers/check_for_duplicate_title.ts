/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObject, SavedObjectKibanaServices, StartServices } from '../../types';
import { findObjectByTitle } from './find_object_by_title';
import { SAVE_DUPLICATE_REJECTED } from '../../constants';
import { displayDuplicateTitleConfirmModal } from './display_duplicate_title_confirm_modal';

/**
 * check for an existing SavedObject with the same title in ES
 * returns Promise<true> when it's no duplicate, or the modal displaying the warning
 * that's there's a duplicate is confirmed, else it returns a rejected Promise<ErrorMsg>
 * @param savedObject
 * @param isTitleDuplicateConfirmed
 * @param onTitleDuplicate
 * @param services
 * @param startServices
 */
export async function checkForDuplicateTitle(
  savedObject: Pick<
    SavedObject,
    'id' | 'title' | 'getDisplayName' | 'lastSavedTitle' | 'copyOnSave' | 'getEsType'
  >,
  isTitleDuplicateConfirmed: boolean,
  onTitleDuplicate: (() => void) | undefined,
  services: Pick<SavedObjectKibanaServices, 'savedObjectsClient' | 'overlays'>,
  startServices: StartServices
): Promise<true> {
  const { savedObjectsClient, overlays } = services;
  // Don't check for duplicates if user has already confirmed save with duplicate title
  if (isTitleDuplicateConfirmed) {
    return true;
  }

  // Don't check if the user isn't updating the title, otherwise that would become very annoying to have
  // to confirm the save every time, except when copyOnSave is true, then we do want to check.
  if (savedObject.title === savedObject.lastSavedTitle && !savedObject.copyOnSave) {
    return true;
  }

  const duplicate = await findObjectByTitle(
    savedObjectsClient,
    savedObject.getEsType(),
    savedObject.title
  );

  if (!duplicate || duplicate.id === savedObject.id) {
    return true;
  }

  if (onTitleDuplicate) {
    onTitleDuplicate();
    return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
  }

  // TODO: make onTitleDuplicate a required prop and remove UI components from this class
  // Need to leave here until all users pass onTitleDuplicate.
  return displayDuplicateTitleConfirmModal(savedObject, overlays, startServices);
}
