/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum AnnoTypes {
  error = 'error',
  warning = 'warning',
}

export interface Annotation {
  name?: string;
  type: AnnoTypes;
  text: string;
  at: number;
}

export interface ParseResult {
  annotations: Annotation[];
}

export type Parser = (source: string) => ParseResult;

export interface ParserWorker {
  parse: (model: string) => Promise<ParseResult | undefined>;
}
