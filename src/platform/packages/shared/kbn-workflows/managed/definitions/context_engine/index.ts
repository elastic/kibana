/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import SIGNAL_GENERATOR_ESQL_TOOL_CALL_YAML from './signal_generator_esql_tool_call.yaml';
import type { ManagedWorkflowDefinition } from '../../types';

export const SIGNAL_GENERATOR_ESQL_TOOL_CALL_WORKFLOW_ID =
  'system-context-engine-signal-generator-esql-tool-call';

/**
 * Signal generator workflow for ES|QL tool call signals.
 *
 * This workflow processes Agent Builder traces to generate tool_call signals
 * for ES|QL executions. It runs hourly and maintains watermark state for
 * incremental processing.
 *
 * Signals are written to the managed signals AI index and classified with
 * boolean flags: has_query_error, has_empty_retrieval, has_coverage_gap.
 */
export const SIGNAL_GENERATOR_ESQL_TOOL_CALL_WORKFLOW = {
  id: SIGNAL_GENERATOR_ESQL_TOOL_CALL_WORKFLOW_ID,
  pluginId: 'contextEngine',
  version: 18,
  billable: false,
  yaml: SIGNAL_GENERATOR_ESQL_TOOL_CALL_YAML,
  management: {
    lifecycle: 'static',
    versionStrategy: 'auto',
    enablement: 'enforced',
  },
} as const satisfies ManagedWorkflowDefinition;
