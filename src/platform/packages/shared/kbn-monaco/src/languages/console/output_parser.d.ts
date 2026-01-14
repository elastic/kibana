/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConsoleOutputParserResult } from './types';

export type OutputParserReviver = (key: string, value: unknown) => unknown;

export type OutputParser = (
  source: string,
  reviver?: OutputParserReviver
) => ConsoleOutputParserResult;

/**
 * Creates a parser for console output that can handle JSON responses,
 * arrays of objects, and multi-document responses.
 */
export const createOutputParser: () => OutputParser;
