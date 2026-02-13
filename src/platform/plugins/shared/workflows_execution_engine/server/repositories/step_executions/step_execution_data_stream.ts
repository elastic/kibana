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
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import type { JsonValue } from '@kbn/utility-types';
import type { SerializedError, StackFrame } from '@kbn/workflows';

export const STEP_EXECUTION_EVENTS_DATA_STREAM = '.workflows-step-data-stream-logs';
// Note: Bump the version when you make changes to the definition.
export const initializeStepExecutionEventsDataStream = (coreDataStreams: DataStreamsSetup) => {
  // return coreDataStreams.registerDataStream({
  //   name: STEP_EXECUTION_EVENTS_DATA_STREAM,
  //   version: 1,
  //   template: {
  //     mappings: stepExecutionEventsMappings,
  //   },
  // });
};

// Note: Only define schema for fields that will be queries against in ES.
const stepExecutionEventsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),
    spaceId: mappings.keyword(),
  },
} satisfies MappingsDefinition;

export interface StepExecutionEventBase extends GetFieldsOf<typeof stepExecutionEventsMappings> {
  stepExecutionId: string;
  workflowRunId: string;
  workflowId: string;
}

export interface StepExecutionStartedEvent extends StepExecutionEventBase {
  type: 'started';
  scopeStack: StackFrame[];
  workflowRunId: string;
  workflowId: string;
  stepId: string;
  stepType?: string;
  topologicalIndex: number;
  globalExecutionIndex: number;
  stepExecutionIndex: number;
  input?: JsonValue;
}

export interface StepExecutionFinishedEvent extends StepExecutionEventBase {
  type: 'finished';
  error?: SerializedError;
  output?: JsonValue;
}

export interface StepExecutionWaitingEvent extends StepExecutionEventBase {
  type: 'waiting';
  resumeAt: string;
}

export type StepExecutionEvent =
  | StepExecutionStartedEvent
  | StepExecutionFinishedEvent
  | StepExecutionWaitingEvent;

export type StepExecutionEventsDataStreamClient = IDataStreamClient<
  typeof stepExecutionEventsMappings,
  StepExecutionEventBase
>;

export const initializeDataStreamClient = (
  coreDataStreams: DataStreamsStart
): Promise<StepExecutionEventsDataStreamClient> => {
  return coreDataStreams.initializeClient(STEP_EXECUTION_EVENTS_DATA_STREAM);
};
