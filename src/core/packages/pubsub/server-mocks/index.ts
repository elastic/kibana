/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PubSubSetup } from '@kbn/core-pubsub-server';
import type { PubSubService } from '@kbn/core-pubsub-server-internal';

const createSetup = (): jest.Mocked<PubSubSetup> => {
  return {
    registerTopic: jest.fn(),
  };
};

const createService = (): jest.Mocked<PublicMethodsOf<PubSubService>> => {
  return {
    setup: jest.fn().mockImplementation(createSetup),
    start: jest.fn(),
    stop: jest.fn(),
  };
};

/** @public */
export const pubSubServiceMock = {
  create: createService,
  createSetup,
};
