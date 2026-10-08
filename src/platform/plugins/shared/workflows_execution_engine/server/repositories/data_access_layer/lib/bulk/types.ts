/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { BulkItem, BulkItemResponse, BulkPlainItem, BulkRequestOptions } from '../../types';

export type SharedBulkItem<TExecution extends { id: string }> = BulkPlainItem<TExecution>;

export interface SharedBulkRequestOptions<TExecution extends { id: string }>
  extends BulkRequestOptions<TExecution> {
  items: SharedBulkItem<TExecution>[];
}

export type BulkOperation<TExecution extends { id: string }> = NonNullable<
  estypes.BulkRequest<TExecution, Partial<TExecution> & { id: string }>['operations']
>[number];

export interface QueueItem<TExecution extends { id: string }> {
  item: BulkItem<TExecution>;
  originalIndex: number;
  remainingRetries: number;
}

export interface DocumentVersion {
  index: string;
  seqNo: number;
  primaryTerm: number;
}

export interface UpdaterSource<TExecution extends { id: string }> {
  source: TExecution;
  seqNo: number;
  primaryTerm: number;
  index: string;
}

export interface Sendable<TExecution extends { id: string }> {
  qi: QueueItem<TExecution>;
  plainItem: BulkPlainItem<TExecution>;
}

export interface Settled {
  originalIndex: number;
  response: BulkItemResponse;
}
