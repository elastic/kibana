/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataStreamsSetup, DataStreamsStart } from '@kbn/core-data-streams-server';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { WORKFLOWS_EXECUTIONS_INDEX } from '@kbn/workflows';
import {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_EXECUTIONS_MANAGED_INDEX_MAPPINGS_VERSION,
} from '../../common/workflow_executions_index';

export { WORKFLOWS_EXECUTIONS_MANAGED_INDEX_MAPPINGS_VERSION };

const workflowExecutionsMappings =
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS as unknown as MappingsDefinition;

// Note: Bump the version when you make changes to the definition.
export const initializeWorkflowExecutionsDataStream = (
  coreDataStreams: DataStreamsSetup,
  dataRetention: string
): void => {
  coreDataStreams.registerDataStream({
    name: WORKFLOWS_EXECUTIONS_INDEX,
    version: 1,
    hidden: true,
    template: {
      lifecycle: {
        data_retention: dataRetention,
      },
      mappings: workflowExecutionsMappings,
    },
  });
};

export const initializeWorkflowExecutionsClient = (coreDataStreams: DataStreamsStart) => {
  return coreDataStreams.initializeClient(WORKFLOWS_EXECUTIONS_INDEX);
};
