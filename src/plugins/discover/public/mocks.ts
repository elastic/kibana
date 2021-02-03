/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DiscoverSetup, DiscoverStart } from '.';

export type Setup = jest.Mocked<DiscoverSetup>;
export type Start = jest.Mocked<DiscoverStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    docViews: {
      addDocView: jest.fn(),
    },
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    savedSearchLoader: {} as any,
    urlGenerator: {
      createUrl: jest.fn(),
    } as any,
  };
  return startContract;
};

export const discoverPluginMock = {
  createSetupContract,
  createStartContract,
};
