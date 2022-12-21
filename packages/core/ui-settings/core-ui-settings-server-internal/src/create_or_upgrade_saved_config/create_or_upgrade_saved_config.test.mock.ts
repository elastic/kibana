/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TransformConfigFn } from '../saved_objects';
import type { getUpgradeableConfig } from './get_upgradeable_config';

export const mockTransform = jest.fn() as jest.MockedFunction<TransformConfigFn>;
jest.mock('../saved_objects', () => ({
  transforms: [mockTransform],
}));

export const mockGetUpgradeableConfig = jest.fn() as jest.MockedFunction<
  typeof getUpgradeableConfig
>;
jest.mock('./get_upgradeable_config', () => ({
  getUpgradeableConfig: mockGetUpgradeableConfig,
}));
