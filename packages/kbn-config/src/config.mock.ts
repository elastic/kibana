/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Config } from './config';

type ConfigMock = jest.Mocked<Config>;

const createConfigMock = (): ConfigMock => ({
  has: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  getFlattenedPaths: jest.fn(),
  toRaw: jest.fn(),
});

export const configMock = {
  create: createConfigMock,
};
