/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SavedSearchCrudTypes } from '../../../common/content_management';
import { SAVED_SEARCH_TYPE } from './constants';

const hasDuplicatedTitle = async (
  title: string,
  contentManagement: ContentManagementPublicStart['client']
): Promise<boolean | void> => {
  if (!title) {
    return;
  }

  const response = await contentManagement.search<
    SavedSearchCrudTypes['SearchIn'],
    SavedSearchCrudTypes['SearchOut']
  >({
    contentTypeId: SAVED_SEARCH_TYPE,
    query: {
      text: `"${title}"`,
    },
    options: {
      searchFields: ['title'],
      fields: ['title'],
    },
  });

  return response.hits.some((obj) => obj.attributes.title.toLowerCase() === title.toLowerCase());
};

export const checkForDuplicateTitle = async ({
  title,
  isTitleDuplicateConfirmed,
  onTitleDuplicate,
  contentManagement,
}: {
  title: string | undefined;
  isTitleDuplicateConfirmed: boolean | undefined;
  onTitleDuplicate: (() => void) | undefined;
  contentManagement: ContentManagementPublicStart['client'];
}) => {
  if (
    title &&
    !isTitleDuplicateConfirmed &&
    onTitleDuplicate &&
    (await hasDuplicatedTitle(title, contentManagement))
  ) {
    onTitleDuplicate();
    return Promise.reject(new Error(`Saved search title already exists: ${title}`));
  }

  return true;
};
