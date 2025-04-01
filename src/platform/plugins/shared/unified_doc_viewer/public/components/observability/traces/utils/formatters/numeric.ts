/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { isFinite } from 'lodash';
import numeral from '@elastic/numeral';
import { Maybe } from '../../typings';

export const NOT_AVAILABLE_LABEL = i18n.translate(
  'unifiedDocViewer.formatters.numeric.notAvailableLabel',
  {
    defaultMessage: 'N/A',
  }
);

export function asDecimal(value: Maybe<number> | null) {
  if (!isFinite(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  return numeral(value).format('0,0.0');
}

export function asInteger(value: Maybe<number> | null) {
  if (!isFinite(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  return numeral(value).format('0,0');
}

export function asDecimalOrInteger(value: Maybe<number>, threshold = 10) {
  if (!isFinite(value)) {
    return NOT_AVAILABLE_LABEL;
  }

  if (value === null || value === undefined || value === 0 || value >= threshold) {
    return asInteger(value);
  }
  return asDecimal(value);
}
