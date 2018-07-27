/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUri } from './repository';

export interface Document {
  repUri: RepositoryUri;
  path: string;
  content: string;
  qnames: string[];
  language?: string;
  sha1?: string;
}

// The base interface of indexer requests
export interface IndexRequest {
  repoUri: RepositoryUri;
}

// The request for LspIndexer
export interface LspIndexRequest extends IndexRequest {
  filePath: string;
}

// The request for RepositoryIndexer
export interface RepositoryIndexRequest extends IndexRequest {
  repoUri: RepositoryUri;
}
