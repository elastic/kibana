/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { URLSearchParams } from 'url';
import { trimStart } from 'lodash';

export const encodePath = (path: string) => {
  const decodedPath = new URLSearchParams(`path=${path}`).get('path') ?? '';
  // Take the initial path and compare it with the decoded path.
  // If the result is not the same, the path is encoded.
  const isEncoded = trimStart(path, '/') !== trimStart(decodedPath, '/');

  // Return the initial path if it is already encoded
  if (isEncoded) {
    return path;
  }

  // Encode every component except slashes
  return path
    .split('/')
    .map((component) => encodeURIComponent(component))
    .join('/');
};
