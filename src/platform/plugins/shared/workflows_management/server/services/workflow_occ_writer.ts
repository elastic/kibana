/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { OccWriter } from '@kbn/occ';
import type { WorkflowCrudService } from './workflow_crud_service';
import type { WorkflowProperties } from '../storage/workflow_storage';

export interface WorkflowDocumentGetOptions {
  includeDeleted?: boolean;
  includeGlobal?: boolean;
}

interface WriteWorkflowDocumentCreateParams {
  document: WorkflowProperties;
}

interface WriteWorkflowDocumentOptimisticParams {
  document: WorkflowProperties;
  ifSeqNo: number;
  ifPrimaryTerm: number;
}

interface WriteWorkflowDocumentReadModifyWriteParams {
  mutate: (existing: WorkflowProperties) => WorkflowProperties;
  maxRetries?: number;
  getOptions?: WorkflowDocumentGetOptions;
}

export type WriteWorkflowDocumentParams =
  | WriteWorkflowDocumentCreateParams
  | WriteWorkflowDocumentOptimisticParams
  | WriteWorkflowDocumentReadModifyWriteParams;

export const isWriteWorkflowDocumentCreateParams = (
  params: WriteWorkflowDocumentParams
): params is WriteWorkflowDocumentCreateParams => 'document' in params && !('ifSeqNo' in params);

export const isWriteWorkflowDocumentOptimisticParams = (
  params: WriteWorkflowDocumentParams
): params is WriteWorkflowDocumentOptimisticParams =>
  'document' in params && 'ifSeqNo' in params && 'ifPrimaryTerm' in params;

export const createWorkflowOccWriter = ({
  crudService,
  spaceId,
  logger,
  maxRetries,
  getOptions,
}: {
  crudService: WorkflowCrudService;
  spaceId: string;
  logger: Logger;
  maxRetries?: number;
  getOptions?: WorkflowDocumentGetOptions;
}): OccWriter<WorkflowProperties> =>
  new OccWriter<WorkflowProperties>({
    get: async (id) => {
      const document = await crudService.getWorkflowDocumentWithVersion(id, spaceId, getOptions);
      if (!document) {
        return null;
      }
      return {
        id,
        source: document.source,
        occ: { seqNo: document.seqNo, primaryTerm: document.primaryTerm },
      };
    },
    index: async ({ id, document, create, ifSeqNo, ifPrimaryTerm }) =>
      crudService.indexWorkflowDocument(id, document, { create, ifSeqNo, ifPrimaryTerm }),
    logger,
    maxRetries,
  });

export const createWorkflowIndexOccWriter = ({
  crudService,
  logger,
}: {
  crudService: WorkflowCrudService;
  logger: Logger;
}): OccWriter<WorkflowProperties> =>
  new OccWriter<WorkflowProperties>({
    index: async ({ id, document, create, ifSeqNo, ifPrimaryTerm }) =>
      crudService.indexWorkflowDocument(id, document, { create, ifSeqNo, ifPrimaryTerm }),
    logger,
  });
