/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VisSavedObject } from '../../types';
import { SAVE_DUPLICATE_REJECTED } from './constants';
import { findVisualizationByTitle } from './find_visualization_by_title';

/**
 * Check for an existing VisSavedObject with the same title in ES
 * returns Promise<true> when it's no duplicate, or the modal displaying the warning
 * that's there's a duplicate is confirmed, else it returns a rejected Promise<ErrorMsg>
 */
export async function checkForDuplicateTitle(
  savedObject: Pick<VisSavedObject, 'id' | 'title' | 'lastSavedTitle'>,
  copyOnSave: boolean,
  isTitleDuplicateConfirmed: boolean,
  onTitleDuplicate: () => void
): Promise<boolean> {
  // Don't check for duplicates if user has already confirmed save with duplicate title
  if (isTitleDuplicateConfirmed) {
    return true;
  }

  // Don't check if the user isn't updating the title, otherwise that would become very annoying to have
  // to confirm the save every time, except when copyOnSave is true, then we do want to check.
  if (savedObject.title === savedObject.lastSavedTitle && !copyOnSave) {
    return true;
  }

  const duplicate = await findVisualizationByTitle(savedObject.title);

  if (!duplicate || duplicate.id === savedObject.id) {
    return true;
  }

  onTitleDuplicate();

  return Promise.reject(new Error(SAVE_DUPLICATE_REJECTED));
}
