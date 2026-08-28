/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EditorHandlers, WorkflowStepExecutionDto } from '@kbn/workflows/types/latest';
import type { WorkflowExecutionLogEntry } from '@kbn/workflows-ui';
import type { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../common';

/** Pre-scoped engine logs API handed to a step's `getLogs` function. */
export interface StepLogsApi {
  fetchLogs: () => Promise<WorkflowExecutionLogEntry[]>;
}

/** A single entry rendered in the Logs tab. */
export interface StepLogEntry {
  message: string;
  timestamp?: string;
  level?: 'info' | 'warn' | 'error';
}

export interface StepLogsConfig {
  enabled: boolean;
  /**
   * How to render log entries in the Logs tab.
   * Currently only `'terminal'` is supported: entries in chronological order, ANSI colors preserved.
   */
  renderer?: 'terminal';
  /**
   * Custom log resolver. When omitted, the Logs tab shows all engine-level log entries
   * for this step via `logsApi.fetchLogs()`. When defined, the step author decides what
   * to show — extract from `output`, call `logsApi`, or combine both.
   */
  getLogs?: (params: {
    stepExecution: WorkflowStepExecutionDto;
    logsApi: StepLogsApi;
  }) => Promise<StepLogEntry[]> | StepLogEntry[];
}

/**
 * Helper function to create a PublicStepDefinition with automatic type inference.
 * This ensures that the editorHandlers' types are correctly inferred
 * from the inputSchema and configSchema without needing explicit type annotations.
 *
 **/
export function createPublicStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
>(
  definition: PublicStepDefinition<Input, Output, Config>
): PublicStepDefinition<Input, Output, Config> {
  return definition;
}

/**
 * User-facing metadata for a workflow step.
 * This is used by the UI to display step information (label, description, icon, schemas, documentation).
 */
export interface PublicStepDefinition<
  Input extends z.ZodType = z.ZodType,
  Output extends z.ZodType = z.ZodType,
  Config extends z.ZodObject = z.ZodObject
> extends CommonStepDefinition<Input, Output, Config> {
  /**
   * Icon type from EUI icon library.
   * Used to visually represent this step type in the UI.
   * kibana icon will be used if not provided
   * TODO: add support for EuiIconType
   */
  icon?: React.ComponentType;

  /**
   * Property handlers for the step.
   */
  editorHandlers?: EditorHandlers<Input, Output, Config>;

  /**
   * Opt-in logs configuration. When `enabled` is true a Logs tab appears in the
   * step execution detail panel. Provide `getLogs` to customise what is shown;
   * omit it to display all engine-level log entries for this step.
   */
  logs?: StepLogsConfig;
}
