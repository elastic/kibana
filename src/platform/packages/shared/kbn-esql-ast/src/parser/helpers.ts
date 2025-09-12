/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Token } from 'antlr4';

export const regexUnquotedIdentifierPattern = /^([a-z\*_\@]{1})[a-z0-9_\*]*$/i;

export const formatIdentifier = (text: string): string => {
  if (regexUnquotedIdentifierPattern.test(text)) {
    return text;
  }

  return `\`${text.replace(/`/g, '``')}\``;
};

export const formatIdentifierParts = (parts: string[]): string =>
  parts.map(formatIdentifier).join('.');

export const getPosition = (
  start: Pick<Token, 'start' | 'stop'> | null,
  stop?: Pick<Token, 'stop'> | undefined
) => {
  if (!start || start.start < 0) {
    return { min: 0, max: 0 };
  }
  const endFirstToken = start.stop > -1 ? Math.max(start.stop + 1, start.start) : undefined;
  return {
    min: start.start,
    max: stop?.stop ?? endFirstToken ?? Infinity,
  };
};

export const nonNullable = <T>(v: T): v is NonNullable<T> => {
  return v != null;
};
