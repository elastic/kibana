/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnhancedStore } from '@reduxjs/toolkit';
import type YAML from 'yaml';
import type { LineCounter } from 'yaml';
import type { WorkflowDetailDto, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowLookup } from './utils/build_workflow_lookup';
import type { WorkflowZodSchemaLooseType } from '../../../../../common/schema';
import type { ConnectorsResponse } from '../../../../entities/connectors/model/types';

export interface WorkflowDetailState {
  /** The yaml string used by the workflow yaml editor */
  yamlString: string;
  /** The persisted workflow detail data */
  workflow?: WorkflowDetailDto;
  /** The computed data derived from the workflow yaml string, it is updated by the workflowComputationMiddleware */
  computed?: ComputedData;
  /** The step id that is focused in the workflow yaml editor */
  focusedStepId?: string;
  /** The step id that is highlighted in the workflow yaml editor */
  highlightedStepId?: string;
  /** The step executions for the workflow */
  stepExecutions?: WorkflowStepExecutionDto[];
  /** The modal to test the workflow is open */
  isTestModalOpen: boolean;
  /** The connectors data */
  connectors?: ConnectorsResponse;
  /** The loose schema for the workflow */
  schemaLoose: WorkflowZodSchemaLooseType;
}

export interface ComputedData {
  yamlDocument?: YAML.Document; // This will be handled specially for serialization
  yamlLineCounter?: LineCounter;
  workflowLookup?: WorkflowLookup;
  workflowGraph?: WorkflowGraph; // This will be handled specially for serialization
  workflowDefinition?: WorkflowYaml | null;
}

// Store types (will be properly typed when store.ts is imported)
export interface RootState {
  detail: WorkflowDetailState;
}
export type WorkflowsStore = EnhancedStore<RootState>;
export type AppDispatch = WorkflowsStore['dispatch'];
