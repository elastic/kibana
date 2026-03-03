/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import {
  ConsoleStepInputSchema,
  DataSetStepInputSchema,
  ForEachStepConfigSchema,
  IfStepConfigSchema,
  WaitStepInputSchema,
  WhileStepConfigSchema,
  WorkflowExecuteAsyncStepOutputSchema,
  WorkflowExecuteStepInputSchema,
} from './schema';
import { type BaseStepDefinition, StepCategory } from './step_definition_types';

const EmptyObjectSchema = z.object({});

export type BuiltInStepDefinition = BaseStepDefinition;

/**
 * Built-in step definitions derived from the Zod schemas in schema.ts.
 * Each definition decomposes into inputSchema (the `with` block),
 * configSchema (step-level props like condition/steps/else/foreach),
 * and outputSchema.
 */
export const builtInStepDefinitions: BaseStepDefinition[] = [
  {
    id: 'console',
    label: 'Console',
    description: 'Log a message for debugging and observability',
    category: StepCategory.Kibana,
    inputSchema: ConsoleStepInputSchema,
    outputSchema: z.string(),
    documentation: {
      examples: [
        `- name: log_payload
  type: console
  with:
    message: "{{ steps.fetch_data.output | json }}"`,
      ],
    },
  },
  {
    id: 'if',
    label: 'If',
    description:
      'Conditional execution. Runs steps when condition is true, with optional else block for the false branch',
    category: StepCategory.FlowControl,
    inputSchema: EmptyObjectSchema,
    outputSchema: EmptyObjectSchema,
    configSchema: IfStepConfigSchema,
    documentation: {
      examples: [
        `- name: check_status
  type: if
  condition: "steps.previous_step.output.status : 'success'"
  steps:
    - name: on_success
      type: console
      with:
        message: "Success!"
  else:
    - name: on_failure
      type: console
      with:
        message: "Failed!"`,
      ],
    },
  },
  {
    id: 'foreach',
    label: 'Loop (foreach)',
    description:
      'Loop over a list. Access current item via {{ foreach.item }}, index via {{ foreach.index }}, total via {{ foreach.total }}',
    category: StepCategory.FlowControl,
    inputSchema: EmptyObjectSchema,
    outputSchema: EmptyObjectSchema,
    configSchema: ForEachStepConfigSchema,
    documentation: {
      examples: [
        `- name: process_items
  type: foreach
  foreach: "{{ steps.search.output.hits.hits | json }}"
  steps:
    - name: log_item
      type: console
      with:
        message: "Processing item {{ foreach.index }}: {{ foreach.item._source.name }}"`,
      ],
    },
  },
  {
    id: 'while',
    label: 'While Loop',
    description:
      'Repeat steps while condition is true (do-while semantics — first iteration always runs). Access iteration index via {{ while.iteration }}',
    category: StepCategory.FlowControl,
    inputSchema: EmptyObjectSchema,
    outputSchema: EmptyObjectSchema,
    configSchema: WhileStepConfigSchema,
    documentation: {
      examples: [
        `- name: poll_api
  type: while
  max-iterations: 10
  condition: "steps.poll_api.inner_http.output.status_code : 200"
  steps:
    - name: inner_http
      type: http
      with:
        url: https://api.example.com/status`,
      ],
    },
  },
  {
    id: 'flow.break',
    label: 'Break',
    description: 'Exit the enclosing loop immediately. Valid only inside a foreach or while body',
    category: StepCategory.FlowControl,
    inputSchema: EmptyObjectSchema,
    outputSchema: EmptyObjectSchema,
    documentation: {
      examples: [
        `- name: stop_on_done
  type: flow.break
  if: "foreach.item.status : 'done'"`,
      ],
    },
  },
  {
    id: 'flow.continue',
    label: 'Continue',
    description:
      'Skip remaining steps in the current iteration and advance to the next one. Valid only inside a foreach or while body',
    category: StepCategory.FlowControl,
    inputSchema: EmptyObjectSchema,
    outputSchema: EmptyObjectSchema,
    documentation: {
      examples: [
        `- name: skip_processed
  type: flow.continue
  if: "foreach.item.processed : true"`,
      ],
    },
  },
  {
    id: 'wait',
    label: 'Wait',
    description: 'Pause execution for a specified duration',
    category: StepCategory.FlowControl,
    inputSchema: WaitStepInputSchema,
    outputSchema: EmptyObjectSchema,
    documentation: {
      examples: [
        `- name: wait_before_retry
  type: wait
  with:
    duration: "30s"`,
      ],
    },
  },
  {
    id: 'data.set',
    label: 'Set Variables',
    description: 'Set variables in the workflow context',
    category: StepCategory.Data,
    inputSchema: DataSetStepInputSchema,
    outputSchema: EmptyObjectSchema,
    documentation: {
      examples: [
        `- name: set_variables
  type: data.set
  with:
    user_name: "{{ steps.get_user.output.body.name }}"
    alert_count: "{{ steps.search_alerts.output.hits.total.value }}"`,
      ],
    },
  },
  {
    id: 'workflow.execute',
    label: 'Execute Workflow',
    description: 'Execute another workflow and wait for it to complete',
    category: StepCategory.FlowControl,
    inputSchema: WorkflowExecuteStepInputSchema,
    outputSchema: z.unknown(),
    documentation: {
      examples: [
        `- name: run_child_workflow
  type: workflow.execute
  with:
    workflow-id: "child_workflow"
    inputs:
      alertId: "{{ workflow.event.id }}"`,
      ],
    },
  },
  {
    id: 'workflow.executeAsync',
    label: 'Execute Workflow (Async)',
    description: 'Start another workflow and continue without waiting for completion',
    category: StepCategory.FlowControl,
    inputSchema: WorkflowExecuteStepInputSchema,
    outputSchema: WorkflowExecuteAsyncStepOutputSchema,
    documentation: {
      examples: [
        `- name: start_child_workflow
  type: workflow.executeAsync
  with:
    workflow-id: "child_workflow"
    inputs:
      alertId: "{{ workflow.event.id }}"`,
      ],
    },
  },
];

const builtInStepDefinitionsMap = new Map(builtInStepDefinitions.map((s) => [s.id, s]));

export function getBuiltInStepDefinition(id: string): BaseStepDefinition | undefined {
  return builtInStepDefinitionsMap.get(id);
}
