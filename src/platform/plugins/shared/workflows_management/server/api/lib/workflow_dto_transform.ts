/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto } from '@kbn/workflows';

import type { WorkflowProperties } from '../../storage/workflow_storage';

/**
 * Transforms a storage document (ES _id + _source) into a public WorkflowDetailDto.
 * Throws if either id or source is undefined.
 */
export const transformStorageDocumentToWorkflowDto = (
  id: string | undefined,
  source: WorkflowProperties | undefined
): WorkflowDetailDto => {
  if (!id || !source) {
    throw new Error('Invalid document, id or source is undefined');
  }
  return {
    id,
    name: source.name,
    description: source.description,
    enabled: source.enabled,
    yaml: source.yaml,
    definition: source.definition,
    createdBy: source.createdBy,
    lastUpdatedBy: source.lastUpdatedBy,
    valid: source.valid,
    createdAt: source.created_at,
    lastUpdatedAt: source.updated_at,
  };
};
