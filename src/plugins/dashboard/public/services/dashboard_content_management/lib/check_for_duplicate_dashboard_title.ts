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
import { extractTitleAndCount } from '../../../dashboard_container/embeddable/api/lib/extract_title_and_count';

export interface DashboardDuplicateTitleCheckProps {
  title: string;
  copyOnSave: boolean;
  lastSavedTitle: string;
  /**
   * invokes the onTitleDuplicate function if provided with a speculative title that should be collision free
   */
  onTitleDuplicate?: (speculativeSuggestion: string) => void;
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
  // Don't check if the title is an empty string
  if (!title) {
    return true;
  }

  // Don't check for duplicates if user has already confirmed save with duplicate title
  if (isTitleDuplicateConfirmed) {
    return true;
  }

  // Don't check if the user isn't updating the title, otherwise that would become very annoying to have
  // to confirm the save every time, except when copyOnSave is true, then we do want to check.
  if (title === lastSavedTitle && !copyOnSave) {
    return true;
  }

  const [baseDashboardName] = extractTitleAndCount(title);

  const { hits } = await contentManagement.client.search<
    DashboardCrudTypes['SearchIn'],
    DashboardCrudTypes['SearchOut']
  >({
    contentTypeId: DASHBOARD_CONTENT_ID,
    query: {
      text: `${baseDashboardName}*`,
      limit: 20,
    },
    options: {
      onlyTitle: true,
    },
  });

  const duplicate = Boolean(
    hits.find((hit) => hit.attributes.title.toLowerCase() === title.toLowerCase())
  );

  if (!duplicate) {
    return true;
  }

  const [largestDuplicationId] = hits
    .map((hit) => extractTitleAndCount(hit.attributes.title)[1])
    .sort((a, b) => b - a);

  const speculativeCollisionFreeTitle = `${baseDashboardName} (${largestDuplicationId + 1})`;

  onTitleDuplicate?.(speculativeCollisionFreeTitle);

  return false;
}
