/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-expect-error no typed yet
import { mathAgg } from '../series/math';

import type { TableResponseProcessorsFunction } from './types';

export const math: TableResponseProcessorsFunction =
  ({ response, panel, series, meta, extractFields }) =>
  (next) =>
  (results) => {
    const mathFn = mathAgg(response, panel, series, meta, extractFields);
    return mathFn(next)(results);
  };
