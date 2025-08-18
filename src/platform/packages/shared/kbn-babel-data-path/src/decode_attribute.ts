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

const reverseTokens = () => {
  const reverseMap = new Map<string, string>();
  TOKENS.forEach((value, key) => {
    reverseMap.set(value, key);
  });
  return reverseMap;
};

const detokenizePath = (tokenizedPath: string) => {
  return tokenizedPath
    .split(sep)
    .map((part) => reverseTokens().get(part) ?? part)
    .join(sep);
};

export const decodeAttribute = (encodedBase64: string) => {
  const binaryString = atob(encodedBase64);
  const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
  const decodedString = new TextDecoder().decode(bytes);

  return detokenizePath(decodedString);
};
