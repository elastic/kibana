/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isLastValueTimerangeMode } from '../../helpers';

// @ts-expect-error no typed yet
import { dropLastBucket } from '../series/drop_last_bucket';

import type { TableResponseProcessorsFunction } from './types';

export const dropLastBucketFn: TableResponseProcessorsFunction =
  ({ response, panel, series }) =>
  (next) =>
  (results) => {
    const shouldDropLastBucket = isLastValueTimerangeMode(panel);

    if (shouldDropLastBucket) {
      const fn = dropLastBucket(response, panel, series);

      return fn(next)(results);
    }

    return next(results);
  };
