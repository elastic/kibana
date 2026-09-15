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

export const NULL_LABEL = i18n.translate('fieldFormats.nullLabel', {
  defaultMessage: '(null)',
  description:
    'Represents the label used to replace a null value in charts, and the tooltip describing the dash shown in tables and Discover',
});

/**
 * Displayed in place of a null value in tables and Discover, where a tooltip can carry the
 * meaning. Not translated: a dash is locale-independent.
 */
export const NULL_TOKEN = '-';

export const NAN_LABEL = 'NaN';

export const MISSING_TOKEN = '__missing__';
