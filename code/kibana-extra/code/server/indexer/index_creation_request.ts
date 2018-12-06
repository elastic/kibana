/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUri } from '../../model';
import {
  DocumentAnalysisSettings,
  DocumentIndexName,
  DocumentSchema,
  DocumentTypeName,
  ReferenceIndexName,
  ReferenceSchema,
  ReferenceTypeName,
  SymbolAnalysisSettings,
  SymbolIndexName,
  SymbolSchema,
  SymbolTypeName,
} from './schema';

export interface IndexCreationRequest {
  index: string;
  type: string;
  settings: any;
  schema: any;
}

export const getDocumentIndexCreationRequest = (repoUri: RepositoryUri): IndexCreationRequest => {
  return {
    index: DocumentIndexName(repoUri),
    type: DocumentTypeName,
    settings: {
      ...DocumentAnalysisSettings,
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
    },
    schema: DocumentSchema,
  };
};

export const getSymbolIndexCreationRequest = (repoUri: RepositoryUri): IndexCreationRequest => {
  return {
    index: SymbolIndexName(repoUri),
    type: SymbolTypeName,
    settings: {
      ...SymbolAnalysisSettings,
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
    },
    schema: SymbolSchema,
  };
};

export const getReferenceIndexCreationRequest = (repoUri: RepositoryUri): IndexCreationRequest => {
  return {
    index: ReferenceIndexName(repoUri),
    type: ReferenceTypeName,
    settings: {
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
    },
    schema: ReferenceSchema,
  };
};
