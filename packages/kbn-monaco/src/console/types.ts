/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ErrorAnnotation {
  at: number;
  text: string;
}

export interface ParsedRequest {
  startOffset: number;
  endOffset: number;
  method: string;
  url: string;
  data?: Array<Record<string, unknown>>;
}
export interface ConsoleParseResult {
  errors: ErrorAnnotation[];
  requests: ParsedRequest[];
}

export interface ConsoleWorkerDefinition {
  getParseResult: (modelUri: string) => ConsoleParseResult | undefined;
}
export type ConsoleParser = (source: string) => ConsoleParseResult | undefined;
