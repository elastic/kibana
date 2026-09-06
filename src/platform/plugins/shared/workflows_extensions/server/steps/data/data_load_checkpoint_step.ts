/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import { dataLoadCheckpointStepCommonDefinition } from '../../../common/steps/data';
import { createServerStepDefinition } from '../../step_registry/types';

export const buildCheckpointId = (input: {
  source: string;
  entity_type: string;
  org: string;
}): string => [input.source, input.entity_type, input.org].map(encodeURIComponent).join(':');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const dataLoadCheckpointStepDefinition = createServerStepDefinition({
  ...dataLoadCheckpointStepCommonDefinition,
  handler: async (context) => {
    const { index, ...identity } = context.input;
    const id = buildCheckpointId(identity);

    try {
      const response = await context.contextManager.getScopedEsClient().get({ index, id });
      if (!isRecord(response._source)) {
        return { error: new Error(`Checkpoint ${id} has a malformed _source`) };
      }
      return { output: response._source };
    } catch (error) {
      if (error instanceof esErrors.ResponseError && error.statusCode === 404) {
        context.logger.debug(`Checkpoint ${id} not found; returning first-run state`);
        return { output: {} };
      }
      return {
        error: new Error(error instanceof Error ? error.message : 'Failed to load checkpoint'),
      };
    }
  },
});
