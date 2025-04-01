/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSelectOption } from '@elastic/eui';
import * as i18n from './translations';

export const THRESHOLD_UNITS: EuiSelectOption[] = [
  { text: i18n.DAYS, value: 'days' },
  { text: i18n.MONTHS, value: 'months' },
  { text: i18n.YEARS, value: 'years' },
];

export const MIN_THRESHOLD_DAYS = 1;
export const MAX_THRESHOLD_DAYS = 1000;

export const DEFAULT_THRESHOLD_ENABLED = false;
export const DEFAULT_THRESHOLD = 3;
export const DEFAULT_THRESHOLD_UNIT: EuiSelectOption = THRESHOLD_UNITS[1];
