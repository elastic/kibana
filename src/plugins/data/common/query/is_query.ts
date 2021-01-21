/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Query } from './types';

export const isQuery = (x: unknown): x is Query =>
  !!x &&
  typeof x === 'object' &&
  typeof (x as Query).language === 'string' &&
  (typeof (x as Query).query === 'string' ||
    (typeof (x as Query).query === 'object' && !!(x as Query).query));
