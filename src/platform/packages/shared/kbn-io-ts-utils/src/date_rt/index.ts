/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as rt from 'io-ts';
import moment from 'moment';

export interface DateBrand {
  readonly Date: unique symbol;
}

export type Date = rt.Branded<string, DateBrand>;

export const dateRt = rt.brand(
  rt.string,
  (date): date is Date => moment(date, true).isValid(),
  'Date'
);
