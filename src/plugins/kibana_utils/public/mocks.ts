/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaUtilsSetup, KibanaUtilsStart } from './plugin';

export type Setup = jest.Mocked<KibanaUtilsSetup>;
export type Start = jest.Mocked<KibanaUtilsStart>;

const createSetupContract = (): Setup => {
  return {
    setVersion: jest.fn(),
  };
};

const createStartContract = (): Start => {
  return undefined;
};

export const kibanaUtilsPluginMock = {
  createSetupContract,
  createStartContract,
};
