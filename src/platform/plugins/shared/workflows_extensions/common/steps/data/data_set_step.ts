/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '../../step_registry/types';

export const DataSetStepTypeId = 'data.set';

export const InputSchema = z.record(z.string(), z.unknown());

export const OutputSchema = z.record(z.string(), z.unknown());

export type DataSetStepInputSchema = typeof InputSchema;
export type DataSetStepOutputSchema = typeof OutputSchema;

export const dataSetStepCommonDefinition: CommonStepDefinition<
  DataSetStepInputSchema,
  DataSetStepOutputSchema
> = {
  id: DataSetStepTypeId,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
};
