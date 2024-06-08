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
  searchLimit?: number;
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
    searchLimit = 10,
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

  const [baseDashboardName, duplicationId] = extractTitleAndCount(title);

  let searchMatchPageHits;
  let searchMatchPaginationObject;

  ({ hits: searchMatchPageHits, pagination: searchMatchPaginationObject } =
    await contentManagement.client.search<
      DashboardCrudTypes['SearchIn'],
      DashboardCrudTypes['SearchOut']
    >({
      contentTypeId: DASHBOARD_CONTENT_ID,
      query: {
        text: title ? `${baseDashboardName}*` : undefined,
        limit: searchLimit,
        cursor: String(duplicationId ? Math.ceil(duplicationId / searchLimit) : 1),
      },
      options: { onlyTitle: true },
    }));

  const isMatchedResultInvalid =
    // Given we are looking to find the collection of dashboards that's closest to the duplicated dashboard with the last incremented number,
    // we compare the last item in the page result we got against the total hits to determine if we should self correct
    searchMatchPageHits.length &&
    extractTitleAndCount(searchMatchPageHits.slice(-1)[0].attributes.title)[1] >
      searchMatchPaginationObject.total;

  if (isMatchedResultInvalid) {
    ({ hits: searchMatchPageHits, pagination: searchMatchPaginationObject } =
      await contentManagement.client.search<
        DashboardCrudTypes['SearchIn'],
        DashboardCrudTypes['SearchOut']
      >({
        contentTypeId: DASHBOARD_CONTENT_ID,
        query: {
          text: title ? `${baseDashboardName}*` : undefined,
          limit: searchLimit,
          cursor: String(Math.ceil(searchMatchPaginationObject.total / searchLimit)),
        },
        options: { onlyTitle: true },
      }));
  }

  const duplicate = Boolean(
    isMatchedResultInvalid ||
      searchMatchPageHits.find((hit) => hit.attributes.title.toLowerCase() === title.toLowerCase())
  );

  if (!duplicate) {
    return true;
  }

  const speculativeCollusionFreeTitle = `${baseDashboardName} (${
    extractTitleAndCount(searchMatchPageHits.slice(-1)[0].attributes.title)[1] + 1
  })`;

  onTitleDuplicate?.(speculativeCollusionFreeTitle);

  return false;
}
