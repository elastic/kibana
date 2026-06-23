/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
  WORKFLOWS_EXECUTIONS_INDEX,
} from '@kbn/workflows';
import { resolveBackingIndex } from '@kbn/workflows/server/utils';

/** Resolves a workflow execution backing index from an encoded ID suffix (data stream era). */
export const resolveWorkflowExecutionBackingIndexFromSuffix = (indexSuffix: string): string =>
  resolveBackingIndex({
    backingIndexPrefix: WORKFLOWS_EXECUTIONS_DATA_STREAM_BACKING_PREFIX,
    indexSuffix,
  });

/** Legacy rollover-alias backing index for unmigrated executions without a pinned index. */
export const resolveLegacyWorkflowExecutionBackingIndexFromSuffix = (indexSuffix: string): string =>
  `${WORKFLOWS_EXECUTIONS_INDEX}-${indexSuffix}`;
