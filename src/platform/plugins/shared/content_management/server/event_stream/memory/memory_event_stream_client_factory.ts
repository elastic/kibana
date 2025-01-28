/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventStreamClient, EventStreamClientFactory } from '../types';
import { MemoryEventStreamClient } from './memory_event_stream_client';

export class MemoryEventStreamClientFactory implements EventStreamClientFactory {
  public create(): EventStreamClient {
    return new MemoryEventStreamClient();
  }
}
