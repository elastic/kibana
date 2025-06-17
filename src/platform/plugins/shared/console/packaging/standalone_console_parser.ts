/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Standalone Console parser that doesn't require any @kbn imports
// Based on the Console parser logic but completely self-contained

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
  return (text: string): ParseResult => {
    const requests: ParsedRequest[] = [];
    const errors: ParseError[] = [];
    
    if (!text || typeof text !== 'string') {
      return { requests, errors };
    }

    try {
      // Simple parsing logic for Console requests
      const lines = text.split('\n');
      let currentRequest: ParsedRequest | null = null;
      let currentData: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('#') || line.startsWith('//')) {
          continue;
        }
        
        // Check if this line looks like a request line (METHOD /path)
        const requestMatch = line.match(/^(GET|POST|PUT|DELETE|HEAD|PATCH)\s+(.+)/i);
        
        if (requestMatch) {
          // Save previous request if exists
          if (currentRequest) {
            if (currentData.length > 0) {
              currentRequest.data = currentData;
            }
            requests.push(currentRequest);
          }
          
          // Start new request
          currentRequest = {
            method: requestMatch[1].toUpperCase(),
            url: requestMatch[2].trim(),
            startOffset: text.indexOf(line),
            endOffset: text.indexOf(line) + line.length
          };
          currentData = [];
        } else if (currentRequest && line.startsWith('{')) {
          // This looks like JSON data for the current request
          let jsonLines = [line];
          let braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          
          // Collect multi-line JSON
          let j = i + 1;
          while (j < lines.length && braceCount > 0) {
            const jsonLine = lines[j].trim();
            if (jsonLine) {
              jsonLines.push(jsonLine);
              braceCount += (jsonLine.match(/\{/g) || []).length - (jsonLine.match(/\}/g) || []).length;
            }
            j++;
          }
          
          currentData.push(jsonLines.join('\n'));
          i = j - 1; // Skip the lines we just processed
        }
      }
      
      // Add the last request
      if (currentRequest) {
        if (currentData.length > 0) {
          currentRequest.data = currentData;
        }
        requests.push(currentRequest);
      }
      
    } catch (error) {
      errors.push({
        text: `Parse error: ${error}`,
        offset: 0
      });
    }
    
    return { requests, errors };
  };
};

// Standalone provider that implements the same interface as ConsoleParsedRequestsProvider
export class StandaloneConsoleParsedRequestsProvider {
  private parser: (text: string) => ParseResult;

  constructor(private model: any) {
    this.parser = createStandaloneConsoleParser();
  }

  public async getRequests(): Promise<ParsedRequest[]> {
    if (!this.model) {
      return [];
    }
    
    try {
      const text = this.model.getValue();
      const result = this.parser(text);
      return result.requests || [];
    } catch (error) {
      console.error('Standalone parser error in getRequests:', error);
      return [];
    }
  }

  public async getErrors(): Promise<ParseError[]> {
    if (!this.model) {
      return [];
    }
    
    try {
      const text = this.model.getValue();
      const result = this.parser(text);
      return result.errors || [];
    } catch (error) {
      console.error('Standalone parser error in getErrors:', error);
      return [];
    }
  }
}

// Factory function to replace getParsedRequestsProvider
export const getStandaloneParsedRequestsProvider = (model: any) => {
  return new StandaloneConsoleParsedRequestsProvider(model);
};