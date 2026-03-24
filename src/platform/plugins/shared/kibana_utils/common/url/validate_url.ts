/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

const generalFormatError = i18n.translate('kibana_utils.url.validate.invalidUrlMessage', {
  defaultMessage: 'Invalid URL format.',
});

const SAFE_URL_PATTERN = /^(?:(?:https?|mailto):|[^&:/?#]*(?:[/?#]|$))/gi;
export function validateUrl(url: string): {
  isValid: boolean;
  error?: string;
  invalidUrl?: string;
} {
  if (!url)
    return {
      isValid: false,
      error: generalFormatError,
    };

  try {
    new URL(url);
    if (!url.match(SAFE_URL_PATTERN)) throw new Error();
    return { isValid: true };
  } catch (e) {
    return {
      isValid: false,
      error: generalFormatError,
      invalidUrl: url,
    };
  }
}
