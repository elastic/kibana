/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeStepExecutionOnGet } from './plain_index/normalize_step_execution_on_get';
import { PlainIndexExecutionsDataAccess } from './plain_index/plain_index_executions_data_access';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../constants/execution_indexes';
import {
  createUnsupportedStorageSourceError,
  validateCreateStepExecutionsDataAccessParams,
} from '../lib/validate_factory_params';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../mappings/step_executions_mappings';
import type { CreateStepExecutionsDataAccessDeps, StepExecutionsDataAccess } from '../types';

export const createStepExecutionsDataAccess = (
  deps: CreateStepExecutionsDataAccessDeps
): StepExecutionsDataAccess => {
  validateCreateStepExecutionsDataAccessParams(deps);

  switch (deps.source) {
    case 'system_index':
      return new PlainIndexExecutionsDataAccess({
        esClient: deps.esClient,
        logger: deps.logger,
        indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
        normalizeExecutionOnGet: normalizeStepExecutionOnGet,
      });
    case 'data_stream':
      throw createUnsupportedStorageSourceError('StepExecutionsDataAccess', deps.source);
    default: {
      const exhaustiveCheck: never = deps.source;
      throw createUnsupportedStorageSourceError('StepExecutionsDataAccess', exhaustiveCheck);
    }
  }
};
