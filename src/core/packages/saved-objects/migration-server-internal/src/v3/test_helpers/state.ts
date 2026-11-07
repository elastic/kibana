/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationContext } from '../context';
import type { ExistingIndexState, PitState } from '../migration_state';
import { createInitialState } from '../state';

/** The state shared by the steps that update an existing index. */
export const existingIndexState = (context: MigrationContext): ExistingIndexState => {
  const { controlState, ...base } = createInitialState();
  return {
    ...base,
    currentIndex: '.kibana_1',
    previousMappings: context.indexMappings,
    updateMappings: true,
    aliasActions: [],
    convertDocuments: true,
  };
};

/** The state shared by the steps that read outdated documents with a point-in-time. */
export const pitState = (context: MigrationContext): PitState => ({
  ...existingIndexState(context),
  batchSize: context.batchSize,
  corruptDocumentIds: [],
  transformErrors: [],
  progress: { processed: undefined, total: undefined },
  hasTransformedDocs: false,
  pitId: 'pit-id',
  lastHitSortValue: undefined,
});
