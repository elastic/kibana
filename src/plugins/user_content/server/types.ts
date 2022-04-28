/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  MetadataEvent,
  MetadataEventsStream,
  MetadataEventsStreamsPluginStart,
} from '@kbn/metadata-events-streams-plugin/server';

import { MetadataEventType } from '../common';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserContentPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserContentPluginStart {}

export interface UserContentStartDependencies {
  metadataEventsStreams: MetadataEventsStreamsPluginStart;
}

export interface UserContentMetadataEvent extends MetadataEvent<MetadataEventType> {
  data: {
    /** The saved object id */
    so_id: string;
    [key: string]: unknown;
  };
}

export type UserContentEventsStream = MetadataEventsStream<UserContentMetadataEvent>;
