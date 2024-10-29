/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const ExternalLinkStrings = {
  getType: () =>
    i18n.translate('links.externalLink.type', {
      defaultMessage: 'External URL',
    }),
  getDisplayName: () =>
    i18n.translate('links.externalLink.displayName', {
      defaultMessage: 'URL',
    }),
  getDescription: () =>
    i18n.translate('links.externalLink.description', {
      defaultMessage: 'Go to URL',
    }),
  getPlaceholder: () =>
    i18n.translate('links.externalLink.editor.placeholder', {
      defaultMessage: 'Enter external URL',
    }),
  getUrlFormatError: () =>
    i18n.translate('links.externalLink.editor.urlFormatError', {
      defaultMessage: 'Invalid format. Example: {exampleUrl}',
      values: {
        exampleUrl: 'https://elastic.co/',
      },
    }),
  getDisallowedUrlError: () =>
    i18n.translate('links.externalLink.editor.disallowedUrlError', {
      defaultMessage:
        'This URL is not allowed by your administrator. Refer to "externalUrl.policy" configuration.',
    }),
};
