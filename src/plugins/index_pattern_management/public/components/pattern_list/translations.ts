/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ACTIVE = i18n.translate('indexPatternManagement.indexPatternList.active', {
  defaultMessage: 'Active',
});

export const INACTIVE = i18n.translate('indexPatternManagement.indexPatternList.inactive', {
  defaultMessage: 'Inactive; index pattern does not match any indices',
});
