/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const EMPTY_LABEL = i18n.translate('fieldFormats.blankLabel', {
  defaultMessage: '(blank)',
  description: 'Represents the label used to replace an empty string value in tables and charts',
});

/** Displayed in place of a null value. Not translated: a dash is locale-independent. */
export const NULL_LABEL = '-';

export const NULL_TOOLTIP_LABEL = i18n.translate('fieldFormats.nullLabel', {
  defaultMessage: '(null)',
  description:
    'Tooltip shown when hovering the dash that replaces a null value in tables and charts',
});

export const NAN_LABEL = 'NaN';

export const MISSING_TOKEN = '__missing__';
