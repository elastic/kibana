/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { ContextProvider, ContextService } from '../context_service';

export enum DocumentType {
  Log = 'log',
  Default = 'default',
}

export interface DocumentContext {
  type: DocumentType;
}

export interface DocumentContextProviderParams {
  record: DataTableRecord;
}

export type DocumentContextProvider = ContextProvider<
  DocumentContextProviderParams,
  DocumentContext
>;

export class DocumentContextService extends ContextService<
  DocumentContextProviderParams,
  DocumentContext
> {
  protected getDefaultContext(): DocumentContext {
    return {
      type: DocumentType.Default,
    };
  }
}

export const documentContextService = new DocumentContextService();

documentContextService.registerProvider({
  order: 0,
  resolve: (params) => {
    if ('message' in params.record.flattened) {
      return {
        type: DocumentType.Log,
      };
    }
  },
});
