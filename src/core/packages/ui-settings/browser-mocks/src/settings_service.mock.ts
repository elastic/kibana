/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { clientMock } from './client.mock';
import { serviceContractMock } from './service_contract.mock';

const createSetupContractMock = () => {
  const client = clientMock();
  const globalClient = clientMock();

  return {
    client,
    globalClient,
  };
};

const createMock = () => {
  const mocked = serviceContractMock();
  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const settingsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};
