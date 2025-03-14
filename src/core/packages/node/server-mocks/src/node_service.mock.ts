/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  NodeService,
  InternalNodeServicePreboot,
  InternalNodeServiceStart,
} from '@kbn/core-node-server-internal';

const createInternalPrebootContractMock = () => {
  const prebootContract: jest.Mocked<InternalNodeServicePreboot> = {
    roles: {
      backgroundTasks: true,
      ui: true,
      migrator: false,
    },
  };
  return prebootContract;
};

const createInternalStartContractMock = (
  {
    ui,
    backgroundTasks,
    migrator,
  }: {
    ui: boolean;
    backgroundTasks: boolean;
    migrator: boolean;
  } = { ui: true, backgroundTasks: true, migrator: false }
) => {
  const startContract: jest.Mocked<InternalNodeServiceStart> = {
    roles: {
      backgroundTasks,
      ui,
      migrator,
    },
  };
  return startContract;
};

type NodeServiceContract = PublicMethodsOf<NodeService>;
const createMock = () => {
  const mocked: jest.Mocked<NodeServiceContract> = {
    preboot: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.preboot.mockResolvedValue(createInternalPrebootContractMock());
  mocked.start.mockReturnValue(createInternalStartContractMock());
  return mocked;
};

export const nodeServiceMock = {
  create: createMock,
  createInternalPrebootContract: createInternalPrebootContractMock,
  createInternalStartContract: createInternalStartContractMock,
};
