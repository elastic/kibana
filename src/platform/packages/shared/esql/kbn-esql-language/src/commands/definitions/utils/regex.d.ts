/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const ESQL_IDENTIFIER_PATTERN = '[A-Za-z_][A-Za-z0-9_]*';
export declare function endsWithComma(text: string): boolean;
export declare function endsWithAssignment(text: string): boolean;
export declare function endsWithWhitespace(text: string): boolean;
export declare function endsWithNonWhitespace(text: string): boolean;
export declare function containsWhitespace(text: string): boolean;
export declare function isOnlyWhitespace(text: string): boolean;
export declare function startsWithWordChar(text: string): boolean;
export declare function endsWithOpenParen(text: string): boolean;
export declare function escapeRegExp(text: string): string;
export declare function matchesWildcardPattern(pattern: string, value: string): boolean;
/** Extracts the trailing identifier from text (e.g., "start" from "end=value start"). */
export declare function getTrailingIdentifier(text: string): string | undefined;
export declare function findFirstNonWhitespaceIndex(text: string): number;
export declare function normalizeWhitespace(text: string): string;
