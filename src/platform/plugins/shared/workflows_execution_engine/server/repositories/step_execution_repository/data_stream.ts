/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataStreamsSetup, DataStreamsStart } from '@kbn/core-data-streams-server';
import type { IDataStreamClient } from '@kbn/data-streams';
import type { MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import { WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM } from './constants';
import { BASIC_MAPPINGS } from '../../../common/mappings';

export const initializeStepExecutionDataStream = (coreDataStreams: DataStreamsSetup) => {
  return coreDataStreams.registerDataStream({
    name: WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM,
    version: 1,
    template: {
      mappings: stepExecutionMappings,
    },
  });
};

const stepExecutionMappings = {
  dynamic: false,
  properties: {
    ...BASIC_MAPPINGS,
    stepId: mappings.keyword(),
    startedAt: mappings.date(),
    finishedAt: mappings.date(),
    duration: mappings.long(),
    type: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export type StepExecutionDataStreamClient = IDataStreamClient<
  typeof stepExecutionMappings,
  Record<string, unknown>
>;

export const initializeDataStreamClient = (
  coreDataStreams: DataStreamsStart
): Promise<StepExecutionDataStreamClient> => {
  return coreDataStreams.initializeClient(WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM);
};

export { WORKFLOWS_STEP_EXECUTIONS_DATA_STREAM };
