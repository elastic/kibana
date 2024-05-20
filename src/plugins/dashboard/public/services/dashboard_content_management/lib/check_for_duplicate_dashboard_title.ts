/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardStartDependencies } from '../../../plugin';
import { DASHBOARD_CONTENT_ID } from '../../../dashboard_constants';
import { DashboardCrudTypes } from '../../../../common/content_management';

export interface DashboardDuplicateTitleCheckProps {
  title: string;
  copyOnSave: boolean;
  lastSavedTitle: string;
  onTitleDuplicate?: () => void;
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
  contentManagement: DashboardStartDependencies['contentManagement']
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

  const { hits } = await contentManagement.client.search<
    DashboardCrudTypes['SearchIn'],
    DashboardCrudTypes['SearchOut']
  >({
    contentTypeId: DASHBOARD_CONTENT_ID,
    query: {
      text: title ? `${title}*` : undefined,
      limit: 10,
    },
    options: { onlyTitle: true },
  });
  const duplicate = hits.find((hit) => hit.attributes.title.toLowerCase() === title.toLowerCase());
  if (!duplicate) {
    return true;
  }
  onTitleDuplicate?.();
  return false;
}
