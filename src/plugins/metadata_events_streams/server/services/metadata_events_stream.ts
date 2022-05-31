/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { MetadataEvent } from '../../common';
import { MetadataEventsStreamsIndex } from './metadata_events_streams_index';

interface Dependencies {
  metadataEventsStreamsIndex: MetadataEventsStreamsIndex;
}
export class MetadataEventsStream<E extends MetadataEvent = MetadataEvent> {
  streamName: string;

  private metadataEventsStreamsIndex: MetadataEventsStreamsIndex;

  constructor(streamName: string, { metadataEventsStreamsIndex }: Dependencies) {
    this.streamName = streamName;
    this.metadataEventsStreamsIndex = metadataEventsStreamsIndex;
  }

  registerEvent(event: E) {
    return this.metadataEventsStreamsIndex.addEventToStream<E>(this.streamName, event);
  }

  bulkRegisterEvents(events: E[]) {
    return this.metadataEventsStreamsIndex.bulkAddEventsToStream<E>(this.streamName, events);
  }

  search(searchRequest?: estypes.SearchRequest) {
    return this.metadataEventsStreamsIndex.search(this.streamName, searchRequest);
  }
}
