/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { CoreApp } from './core_app';

type CoreAppContract = PublicMethodsOf<CoreApp>;
const createMock = (): jest.Mocked<CoreAppContract> => ({
  setup: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
});

export const coreAppMock = {
  create: createMock,
};
