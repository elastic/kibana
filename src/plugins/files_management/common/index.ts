/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN_ID = 'filesManagement';
export const PLUGIN_NAME = i18n.translate('filesManagement.name', {
  defaultMessage: 'Files',
});

export const LIST_BREADCRUMB = [
  {
    text: i18n.translate('filesManagement.listBreadcrumb', {
      defaultMessage: 'Files',
    }),
    href: '#/management/kibana/filesManagement',
  },
];
