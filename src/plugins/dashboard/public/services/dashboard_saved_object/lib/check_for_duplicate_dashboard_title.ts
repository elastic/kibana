/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsClientContract } from '@kbn/core/public';

import { DashboardAttributes } from '../../../../common';
import { DASHBOARD_SAVED_OBJECT_TYPE } from '../../../dashboard_constants';

export interface DashboardDuplicateTitleCheckProps {
  title: string;
  copyOnSave: boolean;
  lastSavedTitle: string;
  onTitleDuplicate: () => void;
  isTitleDuplicateConfirmed: boolean;
}

/**
 * check for an existing dashboard with the same title in ES
 * returns Promise<true> when there is no duplicate, or runs the provided onTitleDuplicate
 * function when the title already exists
 */
export async function checkForDuplicateDashboardTitle(
  {
    title,
    copyOnSave,
    lastSavedTitle,
    onTitleDuplicate,
    isTitleDuplicateConfirmed,
  }: DashboardDuplicateTitleCheckProps,
  savedObjectsClient: SavedObjectsClientContract
): Promise<boolean> {
  // Don't check for duplicates if user has already confirmed save with duplicate title
  if (isTitleDuplicateConfirmed) {
    return true;
  }

  // Don't check if the user isn't updating the title, otherwise that would become very annoying to have
  // to confirm the save every time, except when copyOnSave is true, then we do want to check.
  if (title === lastSavedTitle && !copyOnSave) {
    return true;
  }
  const response = await savedObjectsClient.find<DashboardAttributes>({
    perPage: 10,
    fields: ['title'],
    search: `"${title}"`,
    searchFields: ['title'],
    type: DASHBOARD_SAVED_OBJECT_TYPE,
  });
  const duplicate = response.savedObjects.find(
    (obj) => obj.get('title').toLowerCase() === title.toLowerCase()
  );
  if (!duplicate) {
    return true;
  }
  onTitleDuplicate?.();
  return false;
}
