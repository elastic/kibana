/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UserContentEventsStream } from '../types';

export class MetadataEventsService {
  private userContentEventStreamPromise: Promise<UserContentEventsStream> | undefined;

  constructor() {}

  init({
    userContentEventStreamPromise,
  }: {
    userContentEventStreamPromise: Promise<UserContentEventsStream>;
  }) {
    this.userContentEventStreamPromise = userContentEventStreamPromise;
  }

  async updateViewCounts() {
    // 1. Load snapshot

    const userContentEventStream = await this.userContentEventStreamPromise;

    if (!userContentEventStream) {
      throw new Error(`User content event stream not provided.`);
    }

    const result = await userContentEventStream.search();

    // 2. If no snapshot load events since snapshot otherwise load all events
    return Promise.resolve(result);
  }
}
