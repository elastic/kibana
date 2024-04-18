/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Fields } from '@kbn/apm-synthtrace-client';

export function createAssetsAggregatorFactory<TFields extends Fields>() {
  return function <TAsset extends Record<string, any>, TOutput extends Record<string, any>>({
    filter,
    getAggregateKey,
    init,
  }: {
    filter: (event: TFields) => boolean;
    getAggregateKey: (event: TFields) => string;
    init: (event: TFields) => TAsset;
  }) {};
}
