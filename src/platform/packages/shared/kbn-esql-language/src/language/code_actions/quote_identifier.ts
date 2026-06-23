/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { QuickFix, QuickFixMessage } from './types';

interface TokenToQuote {
  start: number;
  end: number;
  text: string;
}

const quoteIdentifierTitle = i18n.translate('kbn-esql-language.esql.quickFix.quoteIdentifier', {
  defaultMessage: 'Quote identifier with backticks',
});

export const getQuoteIdentifierQuickFixes = (message: QuickFixMessage): QuickFix[] => [
  {
    title: quoteIdentifierTitle,
    fixQuery: (query) => quoteIdentifierNearMessage(query, message),
  },
];

const quoteIdentifierNearMessage = (
  query: string,
  message: QuickFixMessage
): string | undefined => {
  const token = getTokenToQuote(query, message.location?.min);

  if (!token) {
    return;
  }

  return `${query.slice(0, token.start)}${quoteIdentifier(token.text)}${query.slice(token.end)}`;
};

const getTokenToQuote = (query: string, offset?: number): TokenToQuote | undefined => {
  if (offset === undefined) {
    return;
  }

  const token = getTokenAtOrBeforeOffset(query, offset);
  if (!token || isValidUnquotedIdentifier(token.text) || !looksLikeIdentifier(token.text)) {
    return;
  }

  return token;
};

const getTokenAtOrBeforeOffset = (query: string, offset: number): TokenToQuote | undefined => {
  let position = Math.min(offset, query.length - 1);

  while (position >= 0 && isTokenDelimiter(query[position])) {
    position--;
  }

  if (position < 0) {
    return;
  }

  let start = position;
  while (start > 0 && !isTokenDelimiter(query[start - 1])) {
    start--;
  }

  let end = position + 1;
  while (end < query.length && !isTokenDelimiter(query[end])) {
    end++;
  }

  return {
    start,
    end,
    text: query.slice(start, end),
  };
};

const isTokenDelimiter = (character: string): boolean =>
  /\s/.test(character) || ['|', ',', '(', ')', '[', ']', '=', '.'].includes(character);

const isValidUnquotedIdentifier = (text: string): boolean => /^[A-Za-z_][A-Za-z0-9_]*$/.test(text);

const looksLikeIdentifier = (text: string): boolean => /^[A-Za-z_@]/.test(text);

const quoteIdentifier = (text: string): string => `\`${text.replaceAll('`', '``')}\``;
