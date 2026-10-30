/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import { lazySchema, z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const GetLastRunStepTypeId = 'workflow.getLastRun' as const;

const MAX_WINDOW_HOURS = 24 * 365;

export const InputSchema = lazySchema(() =>
  z.object({
    default_hours: z
      .number()
      .int()
      .min(1)
      .max(MAX_WINDOW_HOURS)
      .optional()
      .describe(
        'Hours the window covers on the first run, when there is no earlier run. Defaults to 24.'
      ),
    max_hours: z
      .number()
      .int()
      .min(1)
      .max(MAX_WINDOW_HOURS)
      .optional()
      .describe(
        'Longest window, so a run after a long pause or failures does not read everything since. Defaults to no limit.'
      ),
  })
);

export const OutputSchema = lazySchema(() =>
  z.object({
    first_run: z.boolean().describe('True when this workflow has no earlier successful run.'),
    since: z
      .string()
      .describe(
        'Start of the window to process: when the last successful run started, or default_hours ago on the first run, never further back than max_hours.'
      ),
    hours_since: z.number().describe('Whole hours from `since` to now, rounded up.'),
    last_success: z
      .object({
        execution_id: z.string(),
        started_at: z.string(),
        finished_at: z.string().optional(),
      })
      .optional()
      .describe('The last completed run of this workflow, test runs excluded.'),
  })
);

export type GetLastRunStepInputSchema = typeof InputSchema;
export type GetLastRunStepOutputSchema = typeof OutputSchema;
export type GetLastRunStepOutput = z.infer<typeof OutputSchema>;

export const getLastRunStepCommonDefinition: CommonStepDefinition<
  GetLastRunStepInputSchema,
  GetLastRunStepOutputSchema
> = {
  id: GetLastRunStepTypeId,
  category: StepCategory.FlowControl,
  stability: 'tech_preview',
  label: i18n.translate('workflowsExtensions.getLastRunStep.label', {
    defaultMessage: 'Get last run',
  }),
  description: i18n.translate('workflowsExtensions.getLastRunStep.description', {
    defaultMessage:
      'When this workflow last ran successfully, so a run processes only what is new since',
  }),
  documentation: {
    details: `# Get last run

Returns the window a scheduled workflow should process: everything since its last successful run. No state is stored; the step reads the workflow's own execution history.

## Basic Usage

\`\`\`yaml
- name: last_run
  type: workflow.getLastRun
  with:
    default_hours: 24
    max_hours: 168
- name: new_records
  type: elasticsearch.esql.query
  with:
    query: "FROM logs-* | WHERE @timestamp >= NOW() - {{ steps.last_run.output.hours_since }} hours"
\`\`\`

## Behavior

- Only completed production runs count. Test runs, the current run, and failed or cancelled runs do not move the window, so the records of a failed run are read again by the next one.
- The window starts when the last successful run *started*, not when it finished, so records written while it was working are not missed. Windows can overlap: write results idempotently, with stable ids.
- The history is read as the workflow's own identity, which needs read access to workflow executions.

## Input

- **default_hours** (optional): hours the window covers on the first run. Defaults to 24.
- **max_hours** (optional): the longest window, so a run after a long pause does not read everything since.

## Output

- **first_run**: true when the workflow has no earlier successful run.
- **since**: the start of the window, as an ISO timestamp.
- **hours_since**: whole hours from \`since\` to now, rounded up, for ES|QL \`NOW() - N hours\`.
- **last_success**: \`execution_id\`, \`started_at\` and \`finished_at\` of the last successful run, when there is one.
`,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
