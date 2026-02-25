/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import { DataSetStepSchema, ForEachStepSchema, IfStepSchema, WaitStepSchema } from './schema';

/**
 * Step categories aligned with ActionsMenuGroup from workflows_extensions
 * plus 'flowControl' for built-in control flow steps (if, foreach, wait).
 */
export type StepCategory = 'elasticsearch' | 'external' | 'ai' | 'kibana' | 'data' | 'flowControl';

export interface BuiltInStepDefinition {
  type: string;
  description: string;
  category: StepCategory;
  schema: z.ZodType;
  example: string;
}

/**
 * Extract the description from a step schema's `type` field.
 * In our schemas, `.describe()` is called on `z.literal('step_type')`.
 */
function getTypeDescription(schema: z.ZodObject): string {
  return (schema.shape as Record<string, z.ZodType>).type?.description ?? '';
}

/**
 * Built-in step definitions derived from the Zod schemas in schema.ts.
 * Descriptions come from the `.describe()` calls on each schema's `type` field.
 * Examples are provided for LLM consumption.
 */
export const builtInStepDefinitions: BuiltInStepDefinition[] = [
  {
    type: 'if',
    description: getTypeDescription(IfStepSchema),
    category: 'flowControl',
    schema: IfStepSchema,
    example: `- name: check_status
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
  },
  {
    type: 'foreach',
    description: getTypeDescription(ForEachStepSchema),
    category: 'flowControl',
    schema: ForEachStepSchema,
    example: `- name: process_items
  type: foreach
  foreach: "{{ steps.search.output.hits.hits | json }}"
  steps:
    - name: log_item
      type: console
      with:
        message: "Processing item {{ foreach.index }}: {{ foreach.item._source.name }}"`,
  },
  {
    type: 'wait',
    description: getTypeDescription(WaitStepSchema),
    category: 'flowControl',
    schema: WaitStepSchema,
    example: `- name: wait_before_retry
  type: wait
  with:
    duration: "30s"`,
  },
  {
    type: 'data.set',
    description: getTypeDescription(DataSetStepSchema),
    category: 'data',
    schema: DataSetStepSchema,
    example: `- name: set_variables
  type: data.set
  with:
    user_name: "{{ steps.get_user.output.body.name }}"
    alert_count: "{{ steps.search_alerts.output.hits.total.value }}"`,
  },
];

const builtInStepDefinitionsMap = new Map(builtInStepDefinitions.map((s) => [s.type, s]));

export function getBuiltInStepDefinition(type: string): BuiltInStepDefinition | undefined {
  return builtInStepDefinitionsMap.get(type);
}
