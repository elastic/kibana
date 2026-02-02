/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const MARKDOWN_EMBEDDABLE_TYPE = 'DASHBOARD_MARKDOWN';
export const MARKDOWN_SAVED_OBJECT_TYPE = 'markdown';
export const MARKDOWN_API_PATH = `/api/markdown`;
export const MARKDOWN_API_VERSION = '1';

export const APP_ICON = 'visText';

export const APP_NAME = i18n.translate('markdown.title', {
  defaultMessage: 'Markdown',
});

export const DISPLAY_NAME = i18n.translate('markdown.displayName', {
  defaultMessage: 'markdown',
});
