/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin } from '.';

export type Setup = jest.Mocked<ReturnType<Plugin['setup']>>;
export type Start = jest.Mocked<ReturnType<Plugin['start']>>;

const createSetupContract = (): jest.Mocked<Setup> => {
  const setupContract = {
    registerMenuItem: jest.fn(),
  };

  return setupContract;
};

const createStartContract = (): jest.Mocked<Start> => {
  const startContract = {
    ui: {
      TopNavMenu: jest.fn(),
      AggregateQueryTopNavMenu: jest.fn(),
    },
  };
  return startContract;
};

export const navigationPluginMock = {
  createSetupContract,
  createStartContract,
};
