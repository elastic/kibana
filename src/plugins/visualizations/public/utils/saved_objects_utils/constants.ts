/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

/** An error message to be used when the user rejects a confirm overwrite. */
export const OVERWRITE_REJECTED = i18n.translate('visualizations.overwriteRejectedDescription', {
  defaultMessage: 'Overwrite confirmation was rejected',
});

/** An error message to be used when the user rejects a confirm save with duplicate title. */
export const SAVE_DUPLICATE_REJECTED = i18n.translate(
  'visualizations.saveDuplicateRejectedDescription',
  {
    defaultMessage: 'Save with duplicate title confirmation was rejected',
  }
);
