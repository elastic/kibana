/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { MetadataEvent } from '../types';
import { MetadataEventsStream } from './metadata_events_stream';

import type { MetadataEventsStreamsIndex } from './metadata_events_streams_index';

export class MetadataEventsStreams {
  private streams: Map<string, MetadataEventsStream<MetadataEvent>>;
  private metadataEventsStreamsIndex: MetadataEventsStreamsIndex | undefined;

  constructor() {
    this.streams = new Map<string, MetadataEventsStream<MetadataEvent>>();
  }

  init({ metadataEventsStreamsIndex }: { metadataEventsStreamsIndex: MetadataEventsStreamsIndex }) {
    this.metadataEventsStreamsIndex = metadataEventsStreamsIndex;
  }

  get(streamName: string) {
    return this.streams.get(streamName);
  }

  registerEventStream<T extends MetadataEvent>(streamName: string): MetadataEventsStream<T> {
    if (!this.metadataEventsStreamsIndex) {
      throw new Error(`Metadata events streams service has not been initialized`);
    }

    const stream = new MetadataEventsStream<T>(streamName, {
      metadataEventsStreamsIndex: this.metadataEventsStreamsIndex,
    });

    this.streams.set(streamName, stream);

    return stream;
  }
}
