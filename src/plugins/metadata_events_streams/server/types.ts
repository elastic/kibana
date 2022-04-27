/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { MetadataEventsStream } from './services';

/** Union of all the stream names. For now we only have userContent */
export type StreamName = 'userContent';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MetadataEventsStreamsPluginSetup {}

export interface MetadataEventsStreamsPluginStart {
  userContentMetadataEventsStream: MetadataEventsStream<UserContentMetadataEvent>;
}

export interface MetadataEvent<T = string> {
  type: T;
  data: object;
}

export type UserContentEventsStream = MetadataEventsStream<UserContentMetadataEvent>;

export interface MetadataEventDoc extends MetadataEvent {
  '@timestamp': string;
  stream: StreamName;
}

// --- User content stream events

type UserContentEventType = 'viewed:kibana' | 'edited:kibana';

export interface UserContentMetadataEvent extends MetadataEvent<UserContentEventType> {
  data: {
    /** The saved object id */
    so_id: string;
    [key: string]: unknown;
  };
}
