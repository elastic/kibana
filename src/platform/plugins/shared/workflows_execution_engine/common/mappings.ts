/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  MappingProperty,
  MappingTypeMapping,
  PropertyName,
} from '@elastic/elasticsearch/lib/api/types';
import { mappings } from '@kbn/es-mappings';

export const PLUGIN_ID = 'workflowsExecutionEngine';
export const PLUGIN_NAME = 'Workflows Execution Engine';

export const WORKFLOWS_EXECUTION_STATE_INDEX = '.workflows-execution-state';

export const BASIC_MAPPINGS: Record<PropertyName, MappingProperty> = {
  id: mappings.keyword(),
  spaceId: mappings.keyword(),
  workflowId: mappings.keyword(),
  status: mappings.keyword(),
  createdAt: mappings.date(),
};

export const WORKFLOWS_EXECUTION_STATE_INDEX_MAPPINGS: MappingTypeMapping = {
  dynamic: false,
  properties: {
    ...BASIC_MAPPINGS,
    workflowRunId: mappings.keyword(),
    concurrencyGroupKey: mappings.keyword(),
    type: mappings.keyword(),
  },
};
