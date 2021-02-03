/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

/**
 * An error message to be used when the user rejects a confirm overwrite.
 * @type {string}
 */
export const OVERWRITE_REJECTED = i18n.translate('savedObjects.overwriteRejectedDescription', {
  defaultMessage: 'Overwrite confirmation was rejected',
});
/**
 * An error message to be used when the user rejects a confirm save with duplicate title.
 * @type {string}
 */
export const SAVE_DUPLICATE_REJECTED = i18n.translate(
  'savedObjects.saveDuplicateRejectedDescription',
  {
    defaultMessage: 'Save with duplicate title confirmation was rejected',
  }
);
