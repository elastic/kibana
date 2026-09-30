/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { CatalogFunction } from '@kbn/a2ui-renderer';
import { bool, num, str } from './coerce';

export const euiCatalogFunctions: Record<string, CatalogFunction> = {
  formatNumber: (args) => {
    const decimals = args.decimals === undefined ? undefined : num(args.decimals);
    return num(args.value).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  },

  formatDate: (args) => {
    const parsed = moment(str(args.value));
    if (!parsed.isValid()) return str(args.value);
    return parsed.format(bool(args.withTime) ? 'lll' : 'll');
  },

  concat: (args) => {
    const values = Array.isArray(args.values) ? args.values : [args.values];
    return values.map((value) => str(value)).join(str(args.separator, ''));
  },

  not: (args) => !bool(args.value),

  isEmpty: (args) => {
    const value = args.value;
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    return false;
  },
};
