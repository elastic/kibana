/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EMPTY_LABEL } from '@kbn/field-formats-common';

// TODO: move in some data/table related package
export const SPECIAL_TOKENS_STRING_CONVERSION = new Map([
  [
    '__other__',
    i18n.translate('coloring.colorMapping.terms.otherBucketLabel', {
      defaultMessage: 'Other',
    }),
  ],
  ['', EMPTY_LABEL],
]);

/**
 * Returns special string for sake of color mapping/syncing
 */
export const getSpecialString = (value: string) =>
  SPECIAL_TOKENS_STRING_CONVERSION.get(value) ?? value;
