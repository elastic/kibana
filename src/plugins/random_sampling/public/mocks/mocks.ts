/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RandomSamplingPublicPlugin } from '../plugin';

export type Setup = jest.Mocked<ReturnType<RandomSamplingPublicPlugin['setup']>>;
export type Start = jest.Mocked<ReturnType<RandomSamplingPublicPlugin['start']>>;

const createSetupContract = (): Setup => {
  return {};
};

const createStartContract = (): Start => {
  return {
    ui: {
      ControlSlider: jest.fn(),
      SamplingIcon: jest.fn(),
    },
  };
};

export const randomSamplingPluginMock = {
  createStartContract,
  createSetupContract,
};
