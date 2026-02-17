/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type YAML from 'yaml';
import type { LineCounter } from 'yaml';
import type { WorkflowDetailDto, WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowLookup } from './utils/build_workflow_lookup';
import type { LoadingStates } from './utils/loading_states';
import type { WorkflowZodSchemaType } from '../../../../../common/schema';
import type { ConnectorsResponse } from '../../../connectors/model/types';

export interface WorkflowDetailState {
  /** The yaml string used by the workflow yaml editor */
  yamlString: string;
  /**
   * Whether the YAML editor's internal value is synced with the Redux store.
   * When false, there are pending debounced changes that haven't been dispatched yet.
   * The save button should be disabled when this is false to prevent saving stale data.
   */
  isYamlSynced: boolean;
  /** The persisted workflow detail data */
  workflow?: WorkflowDetailDto;
  /** The computed data derived from the workflow yaml string, it is updated by the workflowComputationMiddleware */
  computed?: ComputedData;
  /** The currently selected execution (when viewing executions tab) */
  execution?: WorkflowExecutionDto;
  /** The computed data derived from the selected execution, it is updated by the loadExecutionThunk */
  computedExecution?: ComputedData;
  /** The active tab (workflow or executions) */
  activeTab?: ActiveTab;
  /** The last known cursor position in the YAML editor (1-based line and column) */
  cursorPosition?: LineColumnPosition;
  /** The step id that is focused in the workflow yaml editor */
  focusedStepId?: string;
  /** The step id that is highlighted in the workflow yaml editor */
  highlightedStepId?: string;
  /** The modal to test the workflow is open */
  isTestModalOpen: boolean;
  /** The connectors data */
  connectors?: ConnectorsResponse;
  /** The schema for the workflow, depends on the connectors available */
  schema: WorkflowZodSchemaType;
  /** Loading states for async operations */
  loading: LoadingStates;
  /** Connector flyout state */
  connectorFlyout: {
    isOpen: boolean;
    connectorType?: string;
    connectorIdToEdit?: string;
    /** Position in Monaco editor where the flyout was opened from (for inserting connector ID) */
    insertPosition?: LineColumnPosition;
  };
}

export type ActiveTab = 'workflow' | 'executions';

export interface ComputedData {
  yamlDocument?: YAML.Document; // This will be handled specially for serialization
  yamlLineCounter?: LineCounter;
  workflowLookup?: WorkflowLookup;
  workflowGraph?: WorkflowGraph; // This will be handled specially for serialization
  workflowDefinition?: WorkflowYaml | null;
}

/**
 * Position in a text document (1-based line and column, matching Monaco editor).
 */
export interface LineColumnPosition {
  lineNumber: number;
  column: number;
}
