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
import { WORKFLOWS_EVENTS_DATA_STREAM } from './constants';

// Note: Bump the version when you make changes to the definition.
export const initializeTriggerEventsDataStream = (coreDataStreams: DataStreamsSetup): void => {
  coreDataStreams.registerDataStream({
    name: WORKFLOWS_EVENTS_DATA_STREAM,
    version: 1,
    template: {
      mappings: triggerEventsMappings,
    },
  });
};

const triggerEventsMappings = {
  dynamic: false,
  properties: {
    '@timestamp': mappings.date(),
    triggerId: mappings.keyword(),
    spaceId: mappings.keyword(),
    subscriptions: mappings.keyword(),
    payload: mappings.object({ properties: {} }),
  },
} satisfies MappingsDefinition;

export interface TriggerEventDocument {
  '@timestamp': string;
  triggerId: string;
  spaceId: string;
  subscriptions: string[];
  payload: Record<string, unknown>;
}

export type TriggerEventsDataStreamClient = IDataStreamClient<
  typeof triggerEventsMappings,
  TriggerEventDocument
>;

export const initializeTriggerEventsClient = (
  coreDataStreams: DataStreamsStart
): Promise<TriggerEventsDataStreamClient> => {
  return coreDataStreams.initializeClient(WORKFLOWS_EVENTS_DATA_STREAM);
};
