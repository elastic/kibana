/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ErrorAnnotation {
  offset: number;
  text: string;
}

export interface ParsedRequest {
  startOffset: number;
  endOffset?: number;
}
export interface ConsoleParserResult {
  errors: ErrorAnnotation[];
  requests: ParsedRequest[];
}

export interface OutputParsedResponse {
  startOffset: number;
  endOffset?: number;
  data?: Array<Record<string, unknown>>;
}
export interface ConsoleOutputParserResult {
  errors: ErrorAnnotation[];
  responses: OutputParsedResponse[];
}

export interface ConsoleWorkerDefinition {
  getParserResult: (modelUri: string) => ConsoleParserResult | undefined;
}
export type ConsoleParser = (source: string) => ConsoleParserResult | undefined;
