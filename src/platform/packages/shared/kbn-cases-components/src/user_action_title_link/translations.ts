/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const UNKNOWN_LINK_LABEL = i18n.translate('cases.components.userActionLabel.unknownLink', {
  defaultMessage: 'Unknown',
});

export const LINK_LOADING_ARIA_LABEL = i18n.translate(
  'cases.components.userActionLabel.loadingLinkAriaLabel',
  {
    defaultMessage: 'Loading link',
    description:
      'Accessibility label for the loading spinner shown while a user action link is loading',
  }
);
