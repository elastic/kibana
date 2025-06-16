/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-ignore
import regenerate from 'regenerate';
import stripAnsi from 'strip-ansi';

// create a regular expression using regenerate() that selects any character that is explicitly allowed by https://www.w3.org/TR/xml/#NT-Char
const validXmlCharsRE = new RegExp(
  `(?:${regenerate()
    .add(0x9, 0xa, 0xd)
    .addRange(0x20, 0xd7ff)
    .addRange(0xe000, 0xfffd)
    .addRange(0x10000, 0x10ffff)
    .toString()})*`,
  'g'
);

export function escapeCdata(input: string) {
  const match = stripAnsi(input).match(validXmlCharsRE) || [];
  return match.join('');
}
