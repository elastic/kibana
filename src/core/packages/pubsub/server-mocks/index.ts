/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PubSubSetup, PubSubStart } from '@kbn/core-pubsub-server';
import type { InternalPubSubSetup, InternalPubSubStart } from '@kbn/core-pubsub-server-internal';

const createSetupContract = (): jest.Mocked<PubSubSetup> => {
  return {
    registerTopic: jest.fn(),
    subscribe: jest.fn(),
  };
};

const createStartContract = (): jest.Mocked<PubSubStart> => {
  return {
    publish: jest.fn(),
  };
};

const createInternalSetupContract = (): jest.Mocked<InternalPubSubSetup> => {
  return {
    registerTopic: jest.fn(),
    subscribe: jest.fn(),
  };
};

const createInternalStartContract = (): jest.Mocked<InternalPubSubStart> => {
  return {
    publish: jest.fn(),
  };
};

/** @public */
export const pubSubServiceMock = {
  createSetupContract,
  createStartContract,
  createInternalSetupContract,
  createInternalStartContract,
};
