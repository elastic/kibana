/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion } from '@kbn/workflows';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import type { z } from '@kbn/zod/v4';

/**
 * Output-schema contributions of a registered step type. Covers the fields both
 * the public and the server step definition expose, plus the browser-only
 * dynamic-schema handler, which is absent on the server.
 */
export interface RegisteredStepOutput {
  outputSchema?: z.ZodType;
  getDynamicOutputSchema?: (args: { input: unknown; config: Record<string, unknown> }) => z.ZodType;
}

/** What a `workflow.execute` step can read from the output of the workflow it runs. */
export interface CalledWorkflowOutputs {
  name: string;
  /** The `outputs` the workflow declares, as written in its definition. */
  outputs: unknown;
  /** Names its completing `workflow.output` steps set; undefined when any field may come back. */
  returnedOutputNames?: readonly string[];
}

/**
 * Registered step and trigger metadata the workflow context schema needs.
 *
 * The registries themselves are owned by the consuming plugin (they hold the
 * `workflows_extensions` start contract), so the plugin builds this adapter.
 */
export interface WorkflowContextRegistry {
  getStepOutput(stepTypeId: string): RegisteredStepOutput | undefined;
  getConnector(stepTypeId: string): ConnectorContractUnion | undefined;
  getTriggerDefinition(triggerType: string): CommonTriggerDefinition | undefined;
  /** Outputs of the workflow with this id; undefined when it isn't known. */
  getCalledWorkflowOutputs?(workflowId: string): CalledWorkflowOutputs | undefined;
}
