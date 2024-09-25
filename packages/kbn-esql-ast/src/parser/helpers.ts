/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const isQuotedIdentifier = (text: string): boolean => {
  const firstChar = text[0];
  const lastChar = text[text.length - 1];

  return firstChar === '`' && lastChar === '`';
};

export const parseIdentifier = (text: string): string => {
  const isQuoted = isQuotedIdentifier(text);

  if (!isQuoted) {
    return text;
  }

  return text.slice(1, -1).replace(/``/g, '`');
};

export const regexUnquotedIdentifierPattern = /^([a-z\*_\@]{1})[a-z0-9_\*]*$/i;

export const formatIdentifier = (text: string): string => {
  if (regexUnquotedIdentifierPattern.test(text)) {
    return text;
  }

  return `\`${text.replace(/`/g, '``')}\``;
};

export const formatIdentifierParts = (parts: string[]): string =>
  parts.map(formatIdentifier).join('.');
