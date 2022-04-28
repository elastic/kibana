/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { MetadataEventsStreams } from './services';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetadataEventsStreamsPluginSetup {}

export interface MetadataEventsStreamsPluginStart {
  registerEventStream: MetadataEventsStreams['registerEventStream'];
}

export interface MetadataEvent<T = string> {
  type: T;
  data: object;
}

export interface MetadataEventDoc extends MetadataEvent {
  '@timestamp': string;
  stream: string;
}
