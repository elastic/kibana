/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowGraph } from '@kbn/workflows/graph';
import type YAML from 'yaml';
import type { EnhancedStore } from '@reduxjs/toolkit';
import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import type { LineCounter } from 'yaml';
import type { WorkflowLookup } from './utils/build_workflow_lookup';

// State interface - only serializable data
export interface WorkflowEditorState {
  yamlString?: string;
  computed?: {
    yamlDocument?: YAML.Document; // This will be handled specially for serialization
    yamlLineCounter?: LineCounter;
    workflowLookup?: WorkflowLookup;
    workflowGraph?: WorkflowGraph; // This will be handled specially for serialization
    workflowDefinition?: WorkflowYaml | null;
  };
  focusedStepId?: string;
  highlightedStepId?: string;
  stepExecutions?: WorkflowStepExecutionDto[];
}

// Store types (will be properly typed when store.ts is imported)
export interface RootState {
  workflow: WorkflowEditorState;
}
export type WorkflowEditorStore = EnhancedStore<RootState>;
export type AppDispatch = WorkflowEditorStore['dispatch'];
