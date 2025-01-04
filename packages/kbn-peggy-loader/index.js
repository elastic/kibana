/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getJsSource } from '@kbn/peggy';

// eslint-disable-next-line import/no-default-export
/**
 * @this {import('webpack').LoaderContext<any>}
 */
export default function () {
  this.cacheable(true);

  const callback = this.async();
  if (!callback) {
    throw new Error('loader requires async support');
  }

  getJsSource({
    path: this.resourcePath,
    format: 'esm',
    optimize: 'size',
  }).then((result) => {
    if (result.config) {
      this.addDependency(result.config.path);
    }

    callback(null, result.source);
  }, callback);
}
