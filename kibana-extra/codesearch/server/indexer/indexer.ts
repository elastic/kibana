/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUri } from 'model';

export interface IndexProgress {
  type: string;
  total: number;
  success: number;
  fail: number;
  percentage: number;
}

export type ProgressReporter = (progress: IndexProgress) => void;

export interface Indexer {
  start(ProgressReporter?: ProgressReporter): void;
  cancel(): void;
}

export interface IndexerFactory {
  create(repoUri: RepositoryUri, revision: string): Indexer;
}
