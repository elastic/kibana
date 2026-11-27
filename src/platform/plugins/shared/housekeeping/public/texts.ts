/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

/** Shared by the app, the page, the flyout and the menu item, so their translations match. */
export const HOUSEKEEPING_TITLE = i18n.translate('housekeeping.title', {
  defaultMessage: 'Housekeeping',
});

export const HOUSEKEEPING_DESCRIPTION = i18n.translate('housekeeping.description', {
  defaultMessage:
    'Broken references, deprecations, risky settings and unused resources found by the checks that each plugin provides.',
});

export const RERUN_LABEL = i18n.translate('housekeeping.rerun', {
  defaultMessage: 'Run checks again',
});
