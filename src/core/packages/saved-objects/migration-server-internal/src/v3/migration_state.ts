/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsRawDoc } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { MigrationLog, Progress } from '../types';
import type { AliasAction } from '../actions';
import type { BulkOperationBatch } from '../model/create_batches';
import type { TransformErrorObjects } from '../core';

/**
 * Fields shared by every state. Static configuration lives in the
 * `MigrationContext`, never in the state.
 */
export interface BaseState {
  readonly retryCount: number;
  /** Number of consecutive polls of a condition that isn't met yet (e.g. a running task). */
  readonly pollCount: number;
  readonly skipRetryReset: boolean;
  readonly retryDelay: number;
  readonly logs: MigrationLog[];
}

/** Fields of the states that create a new index. */
export interface CreateIndexState extends BaseState {
  readonly currentIndex: string;
  readonly aliases: string[];
}

/** Fields of the states that operate on an index that existed when INIT ran. */
export interface ExistingIndexState extends BaseState {
  /** The concrete index, e.g. `.kibana_1` or `.kibana_8.18.0_001`. */
  readonly currentIndex: string;
  /** The index mappings (including `_meta`) as read during INIT. */
  readonly previousMappings: IndexMapping;
  readonly updateMappings: boolean;
  readonly aliasActions: AliasAction[];
  /** Whether this node cleans up and converts the documents of the index. */
  readonly convertDocuments: boolean;
}

/** Fields of the states that convert outdated documents. */
export interface OutdatedDocumentsState extends ExistingIndexState {
  readonly batchSize: number;
  readonly corruptDocumentIds: string[];
  readonly transformErrors: TransformErrorObjects[];
  readonly progress: Progress;
  readonly hasTransformedDocs: boolean;
}

export interface PitState extends OutdatedDocumentsState {
  readonly pitId: string;
  readonly lastHitSortValue: number[] | undefined;
}

export interface TransformState extends PitState {
  readonly outdatedDocuments: SavedObjectsRawDoc[];
}

export interface BulkIndexState extends PitState {
  readonly bulkOperationBatches: BulkOperationBatch[];
  readonly currentBatch: number;
}
