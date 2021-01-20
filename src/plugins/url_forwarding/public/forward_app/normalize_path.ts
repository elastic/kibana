/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { normalize } from 'path';

export function normalizePath(path: string) {
  // resolve ../ within the path
  const normalizedPath = normalize(path);
  // strip any leading slashes and dots and replace with single leading slash
  return normalizedPath.replace(/(\.?\.?\/?)*/, '/');
}
