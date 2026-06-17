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

export interface WriteWorkflowDocumentParams {
  create?: boolean;
  maxRetries?: number;
  getOptions?: WorkflowDocumentGetOptions;
  mutate: (existing: WorkflowProperties | undefined) => WorkflowProperties;
}

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
