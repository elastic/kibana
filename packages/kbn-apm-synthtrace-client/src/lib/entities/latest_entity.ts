/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface LatestEntityDocument {
  'agent.name': string[];
  'data_stream.type': string[];
  'event.ingested': string;
  sourceIndex: string[];
  'entity.lastSeenTimestamp': string;
  'entity.schemaVersion': string;
  'entity.definitionVersion': string;
  'entity.displayName': string;
  'entity.identityFields': string[];
  'entity.metrics': Record<string, number>;
  'entity.id': string;
  'entity.type': string;
  'entity.firstSeenTimestamp': string;
  'entity.definitionId': string;
}
