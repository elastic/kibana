/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createParser } from '@kbn/monaco/src/languages/console/parser';

interface ParsedRequest {
  method?: string;
  url?: string;
  data?: string[];
  startOffset?: number;
  endOffset?: number;
}

interface ParseError {
  text: string;
  offset: number;
}

interface ParseResult {
  requests: ParsedRequest[];
  errors: ParseError[];
}

export const createStandaloneConsoleParser = () => {
  const originalParser = createParser();

  return (text: string): ParseResult => {
    if (!text || typeof text !== 'string') {
      return { requests: [], errors: [] };
    }

    try {
      const result = originalParser(text, undefined);
      return {
        requests: result.requests || [],
        errors: result.errors || [],
      };
    } catch (error) {
      return {
        requests: [],
        errors: [
          {
            text: `Parse error: ${error}`,
            offset: 0,
          },
        ],
      };
    }
  };
};

// Interface that matches ConsoleParsedRequestsProvider from @kbn/monaco
export interface ConsoleParsedRequestsProvider {
  getRequests(): Promise<ParsedRequest[]>;
  getErrors(): Promise<ParseError[]>;
}

// Standalone provider that implements the same interface as ConsoleParsedRequestsProvider
export class StandaloneConsoleParsedRequestsProvider implements ConsoleParsedRequestsProvider {
  private parser: (text: string) => ParseResult;

  constructor(private model: any) {
    this.parser = createStandaloneConsoleParser();
  }

  public async getRequests(): Promise<ParsedRequest[]> {
    if (!this.model || this.model.isDisposed()) {
      return [];
    }

    try {
      const text = this.model.getValue();
      const result = this.parser(text);
      return result.requests || [];
    } catch (error) {
      return [];
    }
  }

  public async getErrors(): Promise<ParseError[]> {
    if (!this.model || this.model.isDisposed()) {
      return [];
    }

    try {
      const text = this.model.getValue();
      const result = this.parser(text);
      return result.errors || [];
    } catch (error) {
      return [];
    }
  }
}

// Factory function to replace getParsedRequestsProvider
export const getStandaloneParsedRequestsProvider = (model: any) => {
  return new StandaloneConsoleParsedRequestsProvider(model);
};

// Factory function that creates the adapter for use in MonacoEditorActionsProvider
export const createStandaloneParsedRequestsProvider = (
  model: any
): ConsoleParsedRequestsProvider => {
  return new StandaloneConsoleParsedRequestsProvider(model);
};
