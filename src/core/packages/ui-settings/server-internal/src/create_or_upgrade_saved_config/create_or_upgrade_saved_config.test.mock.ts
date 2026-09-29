/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { TransformConfigFn } from '../saved_objects';
import type { getUpgradeableConfig } from './get_upgradeable_config';

export const mockTransform = vi.fn() as MockedFunction<TransformConfigFn>;
vi.doMock('../saved_objects', () => ({
  transforms: [mockTransform],
}));

export const mockGetUpgradeableConfig = vi.fn() as MockedFunction<typeof getUpgradeableConfig>;
vi.doMock('./get_upgradeable_config', () => ({
  getUpgradeableConfig: mockGetUpgradeableConfig,
}));
