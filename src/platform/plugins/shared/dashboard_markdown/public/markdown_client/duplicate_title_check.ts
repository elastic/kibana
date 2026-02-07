/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { markdownClient } from './markdown_client';

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
  try {
    if (isTitleDuplicateConfirmed) {
      return true;
    }

    if (title === lastSavedTitle && !copyOnSave) {
      return true;
    }

    const { markdowns } = await markdownClient.search({
      search: `"${title}"`,
    });

    const existing = markdowns.find(
      (markdown) => markdown.data.title.toLowerCase() === title.toLowerCase()
    );
    if (!existing || existing.id === id) {
      return true;
    }

    onTitleDuplicate();
    return Promise.reject(new Error(rejectErrorMessage));
  } catch (error) {
    return { error };
  }
};
