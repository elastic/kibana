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
import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const DataLoadCheckpointStepTypeId = 'data.loadCheckpoint' as const;

export const InputSchema = z.object({
  index: z.string().min(1),
  source: z.string().min(1),
  entity_type: z.string().min(1),
  org: z.string().min(1),
});

export const OutputSchema = z.record(z.string(), z.unknown());
export const ConfigSchema = z.object({});

export type DataLoadCheckpointStepInputSchema = typeof InputSchema;
export type DataLoadCheckpointStepOutputSchema = typeof OutputSchema;
export type DataLoadCheckpointStepConfigSchema = typeof ConfigSchema;

export const dataLoadCheckpointStepCommonDefinition: CommonStepDefinition<
  DataLoadCheckpointStepInputSchema,
  DataLoadCheckpointStepOutputSchema,
  DataLoadCheckpointStepConfigSchema
> = {
  id: DataLoadCheckpointStepTypeId,
  category: StepCategory.Data,
  label: i18n.translate('workflowsExtensions.dataLoadCheckpointStep.label', {
    defaultMessage: 'Load checkpoint',
  }),
  description: i18n.translate('workflowsExtensions.dataLoadCheckpointStep.description', {
    defaultMessage: 'Load a workflow ETL checkpoint by its stable identity',
  }),
  documentation: {
    details: `Loads one checkpoint document and exposes its source fields directly to downstream steps.

The stable checkpoint id is \`<source>:<entity_type>:<org>\`. A missing checkpoint is a valid
first-run state and returns an empty object. Malformed non-object checkpoint sources fail the step.

\`\`\`yaml
- name: checkpoint
  type: data.loadCheckpoint
  with:
    index: github-intel-sync-state
    source: github-catalog-repos
    entity_type: repo
    org: "{{ consts.orgLogin }}"

- name: pages
  type: while
  condition: "{{ steps.checkpoint.output.cursor }}"
  steps: []
\`\`\``,
  },
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  configSchema: ConfigSchema,
};
