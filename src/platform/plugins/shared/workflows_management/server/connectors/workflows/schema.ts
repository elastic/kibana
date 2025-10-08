/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const RunSubActionParamsSchema = schema.object({
  workflowId: schema.string(),
  inputs: schema.maybe(schema.any()),
  alerts: schema.arrayOf(schema.any()),
  spaceId: schema.string(),
});

// Schema for rule configuration (what the UI saves)
export const WorkflowsRuleActionParamsSchema = schema.object({
  subAction: schema.literal('run'),
  subActionParams: schema.object({
    workflowId: schema.string(),
    inputs: schema.maybe(schema.any()),
  }),
});

// Schema for execution (what the executor receives)
export const ExecutorParamsSchema = schema.object({
  subAction: schema.literal('run'),
  subActionParams: RunSubActionParamsSchema,
});

export const ExecutorSubActionRunParamsSchema = RunSubActionParamsSchema;
