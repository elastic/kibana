/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  MAX_HEADING_LENGTH,
  MAX_WORKFLOW_ID_LENGTH,
  MAX_WORKFLOW_INPUT_NAME_LENGTH,
  MAX_WORKFLOW_INPUTS,
  stateKeySchema,
  stateValueSchema,
} from '@kbn/custom-app-common';
import { type ActionOf, defineAction } from '@kbn/custom-app-registry';
import { lazySchema, z } from '@kbn/zod/v4';

/**
 * Where an action may run a workflow: when something is pressed or a row is clicked, never when an
 * input changes, which is every key that is typed and would start a workflow for each.
 */
const WORKFLOW_EVENTS: readonly string[] = ['onClick', 'onRowClick', 'onChartClick', 'onSubmit'];

/**
 * Runs a Workflow, as the person who triggered it, so it needs no more privilege than they have.
 * What it hands over is a closed set: a fixed value, a column of the row that was clicked, or a
 * value of the app. They travel as typed values and are never put together into text.
 */
export const runWorkflowAction = defineAction({
  kind: 'action',
  id: 'runWorkflow',
  version: 1,
  props: lazySchema(() =>
    z.object({
      workflow: z
        .string()
        .min(1)
        .max(MAX_WORKFLOW_ID_LENGTH)
        .describe('The id of the workflow, as the Workflows application knows it.'),
      inputs: z
        .record(
          z.string().min(1).max(MAX_WORKFLOW_INPUT_NAME_LENGTH),
          z.union([
            stateValueSchema,
            z.object({ fromColumn: z.string().min(1).max(MAX_HEADING_LENGTH) }),
            z.object({ fromState: stateKeySchema }),
          ])
        )
        .refine((inputs) => Object.keys(inputs).length <= MAX_WORKFLOW_INPUTS, {
          message: `An action may hand at most ${MAX_WORKFLOW_INPUTS} inputs to a workflow`,
        })
        .default({})
        .describe(
          'What to hand to the workflow, by the name of each input: a fixed value, a column of the row that was clicked, or a value of the app.'
        ),
    })
  ),
  doc: {
    summary:
      'Runs a workflow, as the person who pressed, once they have confirmed it. It can only be run by a button, a row click, a click on a chart or a form that is submitted.',
    whenToUse:
      'To do something that changes things: create a case, acknowledge an alert, send a message.',
    example: {
      type: 'runWorkflow',
      workflow: 'notify-on-call',
      inputs: { service: { fromColumn: 'service' } },
    },
  },
  validate: (action, { nodeId, event, allowed, state, issue }) => {
    if (!WORKFLOW_EVENTS.includes(event)) {
      issue(
        `Node "${nodeId}" runs a workflow on ${event}; a workflow can only be run by a button, a row click, a click on a chart or a form that is submitted`
      );
    }
    Object.entries(action.inputs).forEach(([name, value]) => {
      if (typeof value !== 'object') return;
      if ('fromColumn' in value && !allowed.fromColumn) {
        issue(
          `Node "${nodeId}": the input "${name}" of the workflow takes a column, which only a row click has`
        );
      }
      if ('fromState' in value && !(value.fromState in state)) {
        issue(
          `Node "${nodeId}": the input "${name}" of the workflow takes the unknown state key "${value.fromState}"`
        );
      }
    });
  },
});

declare module '@kbn/custom-app-registry' {
  interface ActionTypeMap {
    runWorkflow: ActionOf<typeof runWorkflowAction>;
  }
}

/** What the app is handed to run, with every input already resolved. */
export type RunWorkflowAction = ActionOf<typeof runWorkflowAction>;
