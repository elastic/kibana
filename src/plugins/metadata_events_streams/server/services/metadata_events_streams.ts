/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { StreamName, MetadataEvent } from '../types';
import { MetadataEventsStream } from './metadata_events_stream';

export class MetadataEventsStreams {
  private streams: Map<StreamName, MetadataEventsStream<MetadataEvent>>;

  constructor() {
    this.streams = new Map<StreamName, MetadataEventsStream<MetadataEvent>>();
  }

  register(streamName: StreamName, stream: MetadataEventsStream<MetadataEvent>) {
    this.streams.set(streamName, stream);
  }

  get(streamName: StreamName) {
    return this.streams.get(streamName);
  }
}
