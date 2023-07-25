/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ExternalLinkEmbeddableStrings = {
  getType: () =>
    i18n.translate('navigationEmbeddable.externalLink.type', {
      defaultMessage: 'External URL',
    }),
  getDisplayName: () =>
    i18n.translate('navigationEmbeddable.externalLink.displayName', {
      defaultMessage: 'URL',
    }),
  getDescription: () =>
    i18n.translate('navigationEmbeddable.externalLink.description', {
      defaultMessage: 'Go to URL',
    }),
  getPlaceholder: () =>
    i18n.translate('navigationEmbeddable.externalLink.editor.placeholder', {
      defaultMessage: 'Enter external URL',
    }),
};
