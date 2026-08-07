/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import type { GetFieldsOf } from '@kbn/es-mappings';
import type {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from '../../mappings';

export type EsWorkflowStepExecutionEntry = GetFieldsOf<
  typeof WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS
>;

export type StepExecutionsDataStreamClient = IDataStreamClient<
  typeof WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
  EsWorkflowStepExecutionEntry
>;

export type EsWorkflowExecutionEntry = GetFieldsOf<typeof WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS>;

export type WorkflowExecutionsDataStreamClient = IDataStreamClient<
  typeof WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  EsWorkflowExecutionEntry
>;
