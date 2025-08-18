/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sep } from 'path';
import { TOKENS } from './constants';

const tokenizePath = (path: string) =>
  path
    .split(sep)
    .map((part) => TOKENS.get(part) ?? part)
    .join(sep);

export const encodeAttribute = (path: string) => {
  const tokenizedPath = tokenizePath(path);

  const utf8Bytes = new TextEncoder().encode(tokenizedPath);
  const binaryString = Array.from(utf8Bytes)
    .map((b) => String.fromCharCode(b))
    .join('');

  return btoa(binaryString);
};
