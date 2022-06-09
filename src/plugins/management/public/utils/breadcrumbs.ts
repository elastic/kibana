/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

const managementBreadcrumbText = i18n.translate('management.breadcrumb', {
  defaultMessage: 'Stack Management',
});

export const MANAGEMENT_BREADCRUMB_NO_HREF = {
  text: managementBreadcrumbText,
};

export const MANAGEMENT_BREADCRUMB = {
  text: managementBreadcrumbText,
  href: '/',
};
