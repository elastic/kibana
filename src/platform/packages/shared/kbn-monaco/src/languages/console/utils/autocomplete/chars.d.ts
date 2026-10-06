/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const isWhitespace: (ch: string | undefined) => ch is '\t' | '\n' | '\r' | ' ';
/**
 * Walks backwards from `fromIndex` until a non-whitespace character is found.
 * Returns that index, or -1 if the scan runs past the beginning.
 */
export declare const skipWhitespaceBackward: (text: string, fromIndex: number) => number;
export declare const isAsciiLetter: (ch: string | undefined) => boolean;
/**
 * Returns true when `index` is positioned at the start of a line.
 * Console input is normalized to `\n` line separators.
 */
export declare const isStartOfLine: (text: string, index: number) => boolean;
/**
 * Returns true when the character at `index` is escaped, i.e. preceded by an odd number of
 * backslashes.
 */
export declare const isEscaped: (text: string, index: number) => boolean;
