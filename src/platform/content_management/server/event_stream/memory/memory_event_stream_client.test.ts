/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MemoryEventStreamClient } from './memory_event_stream_client';
import { testEventStreamClient } from '../tests/test_event_stream_client';

const client = new MemoryEventStreamClient();

describe('MemoryEventStreamClient', () => {
  testEventStreamClient(Promise.resolve(client));
});
