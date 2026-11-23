/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The markdown a drift issue is written in: code spans, table cells, counted nouns and lists of
 * names. Nothing here knows anything about the check; it is the vocabulary its sections share.
 */

const REPO_BLOB_URL = 'https://github.com/elastic/kibana/blob/main';

/** How many names a list shows before it counts the rest. */
export const MAX_LISTED = 3;

/** `1 action`, `2 actions`, `3 entries`. */
export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

/** The verb for a count of actions: `1 action fails`, `2 actions fail`. */
export const fails = (count: number): string => (count === 1 ? 'fails' : 'fail');

/** Text as a code span. A backtick inside it would end the span, so it becomes a quote. */
export const code = (text: string): string => `\`${text.replace(/`/g, "'")}\``;

// A table cell can't hold a pipe or a line break. GitHub reads a backslash and the character after
// it as one, so the backslashes before a pipe are doubled, and the pipe escaped after them. Other
// backslashes stay as they are, as code spans in the cell show them literally.
export const cell = (text: string): string =>
  text
    .replace(/(\\*)\|/g, (_, backslashes: string) => `${backslashes}${backslashes}\\|`)
    .replace(/\s*\n\s*/g, ' ');

/** `a`, `b` and `c`, up to `max` of them, then "and 2 more". Nothing listed reads as nothing. */
export const listed = (items: readonly string[], max = MAX_LISTED): string => {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  if (rest > 0) {
    return `${shown.join(', ')} and ${rest} more`;
  }
  if (shown.length <= 1) {
    return shown[0] ?? '';
  }
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
};

/** Text as a link into the repository, or as it is when the connector's folder isn't known. */
export const link = (text: string, folder: string | undefined, file = ''): string =>
  folder === undefined ? text : `[${text}](${REPO_BLOB_URL}/${folder}${file ? `/${file}` : ''})`;

export const capitalized = (text: string): string =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
