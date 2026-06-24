/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DomainEventsServiceSetup,
  DomainEventsServiceStart,
} from '@kbn/core-domain-events-server';
import { lazyObject } from '@kbn/lazy-object';

export const domainEventsServiceMock = {
  createSetupContract: (): jest.Mocked<DomainEventsServiceSetup> =>
    lazyObject({
      subscribe: jest.fn().mockReturnValue(jest.fn()),
      subscribeAll: jest.fn().mockReturnValue(jest.fn()),
    }),

  createStartContract: (): jest.Mocked<DomainEventsServiceStart> =>
    lazyObject({
      publish: jest.fn(),
    }),
};
