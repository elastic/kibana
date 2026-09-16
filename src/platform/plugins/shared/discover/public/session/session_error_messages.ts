/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const saveFailedTitle = i18n.translate('discover.sessionSaveErrors.saveFailedTitle', {
  defaultMessage: 'Unable to save the session',
});

/** Provides save error summaries by HTTP status; unlisted statuses keep the existing message. */
export const sessionSaveErrorMessages: Partial<
  Record<number, { title: string; description: string }>
> = {
  400: {
    title: saveFailedTitle,
    description: i18n.translate('discover.sessionSaveErrors.invalidDataDescription', {
      defaultMessage: 'Some session data is invalid.',
    }),
  },
  403: {
    title: i18n.translate('discover.sessionSaveErrors.forbiddenTitle', {
      defaultMessage: 'Saving is not allowed',
    }),
    description: i18n.translate('discover.sessionSaveErrors.forbiddenDescription', {
      defaultMessage: 'You do not have permission to save this session.',
    }),
  },
  409: {
    title: i18n.translate('discover.sessionSaveErrors.conflictTitle', {
      defaultMessage: 'Conflict while saving the session',
    }),
    description: i18n.translate('discover.sessionSaveErrors.conflictDescription', {
      defaultMessage: 'The session could not be saved because of a conflict.',
    }),
  },
  500: {
    title: saveFailedTitle,
    description: i18n.translate('discover.sessionSaveErrors.internalErrorDescription', {
      defaultMessage: 'An internal error occurred. Try again.',
    }),
  },
};
