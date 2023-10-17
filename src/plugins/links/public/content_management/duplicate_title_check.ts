/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { linksClient } from './links_content_management_client';

const rejectErrorMessage = i18n.translate('links.saveDuplicateRejectedDescription', {
  defaultMessage: 'Save with duplicate title confirmation was rejected',
});

interface Props {
  title: string;
  id?: string;
  onTitleDuplicate: () => void;
  lastSavedTitle: string;
  copyOnSave: boolean;
  isTitleDuplicateConfirmed: boolean;
}

export const checkForDuplicateTitle = async ({
  id,
  title,
  lastSavedTitle,
  copyOnSave,
  isTitleDuplicateConfirmed,
  onTitleDuplicate,
}: Props) => {
  if (isTitleDuplicateConfirmed) {
    return true;
  }

  if (title === lastSavedTitle && !copyOnSave) {
    return true;
  }

  const { hits } = await linksClient.search(
    {
      text: `"${title}"`,
      limit: 10,
    },
    { onlyTitle: true }
  );

  const existing = hits.find((obj) => obj.attributes.title.toLowerCase() === title.toLowerCase());

  if (!existing || existing.id === id) {
    return true;
  }

  onTitleDuplicate();
  return Promise.reject(new Error(rejectErrorMessage));
};
