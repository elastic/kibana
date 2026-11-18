/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import { lazySchema, z } from '@kbn/zod';
import {
  WORKFLOW_RUN_PANEL_MAX_CONSTANT_LENGTH,
  WORKFLOW_RUN_PANEL_MAX_MAPPINGS,
} from '../../common/dashboard_run_panel/constants';

const inputNameSchema = lazySchema(() =>
  z.string().min(1).max(255).meta({ description: 'Name of the workflow input this mapping fills.' })
);

const controlMappingSchema = lazySchema(() =>
  z
    .object({
      input: inputNameSchema,
      source: z.literal('control'),
      control_id: z.string().min(1).max(255).meta({
        description: 'ID of the dashboard control whose current selection fills the input.',
      }),
    })
    .strict()
    .meta({ title: 'control' })
);

const timeRangeMappingSchema = lazySchema(() =>
  z
    .object({
      input: inputNameSchema,
      source: z.literal('time_range'),
      part: z.enum(['from', 'to']).optional().meta({
        description:
          'Pass only the start or end of the range as an ISO timestamp. When omitted, the input receives the whole range (see the dashboardTimeRange input definition).',
      }),
    })
    .strict()
    .meta({ title: 'time_range' })
);

const queryMappingSchema = lazySchema(() =>
  z
    .object({
      input: inputNameSchema,
      source: z.literal('query'),
    })
    .strict()
    .meta({
      title: 'query',
      description:
        'Pass the dashboard query and filters, as authored and compiled (see the dashboardQuery input definition).',
    })
);

const constantValueSchema = lazySchema(() =>
  z.union([
    z.string().max(WORKFLOW_RUN_PANEL_MAX_CONSTANT_LENGTH),
    z.number(),
    z.boolean(),
    z.array(z.string().max(WORKFLOW_RUN_PANEL_MAX_CONSTANT_LENGTH)).max(100),
  ])
);

const constantMappingSchema = lazySchema(() =>
  z
    .object({
      input: inputNameSchema,
      source: z.literal('constant'),
      value: constantValueSchema,
    })
    .strict()
    .meta({ title: 'constant' })
);

export const workflowRunInputMappingSchema = lazySchema(() =>
  z.discriminatedUnion('source', [
    controlMappingSchema,
    timeRangeMappingSchema,
    queryMappingSchema,
    constantMappingSchema,
  ])
);

const workflowRunGraphLayoutSchema = lazySchema(() => z.enum(['auto', 'horizontal', 'vertical']));

export const workflowRunEmbeddableSchema = lazySchema(() =>
  z
    .object({
      ...serializedTitlesSchema.shape,
      workflow_id: z
        .string()
        .min(1)
        .max(255)
        .meta({ description: 'ID of the workflow the panel runs, in the dashboard space.' }),
      button_label: z
        .string()
        .max(100)
        .optional()
        .meta({ description: 'Text on the run button. Defaults to "Run workflow".' }),
      input_mappings: z
        .array(workflowRunInputMappingSchema)
        .max(WORKFLOW_RUN_PANEL_MAX_MAPPINGS)
        .optional()
        .meta({
          description:
            'Where each workflow input gets its value when a viewer runs the workflow. Inputs without a mapping are asked for in the confirmation dialog.',
        }),
      graph_layout: workflowRunGraphLayoutSchema.optional().meta({
        description:
          'Direction of the workflow graph drawn in the panel. `auto` (the default) picks the direction that draws the graph largest in the panel.',
      }),
    })
    .strict()
    .meta({ description: 'Run workflow panel schema' })
);

export type WorkflowRunInputMapping = z.output<typeof workflowRunInputMappingSchema>;
export type WorkflowRunConstantValue = z.output<typeof constantValueSchema>;
export type WorkflowRunEmbeddableState = z.output<typeof workflowRunEmbeddableSchema>;
export type WorkflowRunGraphLayout = z.output<typeof workflowRunGraphLayoutSchema>;
