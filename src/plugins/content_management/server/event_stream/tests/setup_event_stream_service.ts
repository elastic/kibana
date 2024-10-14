/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type CoreSetup } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { EventStreamService } from '../event_stream_service';
import { EventStreamLoggerMock } from './event_stream_logger_mock';
import { MemoryEventStreamClientFactory } from '../memory';

export const setupEventStreamService = (kibanaCoreSetup: CoreSetup = coreMock.createSetup()) => {
  const logger = new EventStreamLoggerMock();
  const clientFactory = new MemoryEventStreamClientFactory();
  const service = new EventStreamService({
    logger,
    clientFactory,
  });

  service.setup({ core: kibanaCoreSetup });
  service.start();

  return {
    logger,
    clientFactory,
    service,
  };
};
