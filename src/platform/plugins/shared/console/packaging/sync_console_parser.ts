/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createParser } from '@kbn/monaco/src/languages/console/parser';
import { monaco } from '@kbn/monaco';

// Create synchronous versions of the parser types
interface SyncConsoleParsedRequestsProvider {
  getRequests(): Promise<any[]>;
  getErrors(): Promise<any[]>;
}

export class SyncConsoleParsedRequestsProvider implements SyncConsoleParsedRequestsProvider {
  private parser: any;

  constructor(private model: monaco.editor.ITextModel | null) {
    this.parser = createParser();
  }

  public async getRequests(): Promise<any[]> {
    if (!this.model) {
      return [];
    }
    
    try {
      const text = this.model.getValue();
      const result = this.parser(text);
      return result?.requests || [];
    } catch (error) {
      console.error('Sync parser error in getRequests:', error);
      return [];
    }
  }

  public async getErrors(): Promise<any[]> {
    if (!this.model) {
      return [];
    }
    
    try {
      const text = this.model.getValue();
      const result = this.parser(text);
      return result?.errors || [];
    } catch (error) {
      console.error('Sync parser error in getErrors:', error);
      return [];
    }
  }
}

// Override the getParsedRequestsProvider function
export const getSyncParsedRequestsProvider = (model: monaco.editor.ITextModel | null) => {
  return new SyncConsoleParsedRequestsProvider(model);
};