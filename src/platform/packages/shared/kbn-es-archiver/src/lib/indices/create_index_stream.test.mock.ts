/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MockedFunction } from 'vitest';
import { vi } from 'vitest';

import type {
  cleanSavedObjectIndices,
  deleteSavedObjectIndices,
  isSavedObjectIndex,
} from './kibana_index';

export const mockCleanSavedObjectIndices = vi.fn() as MockedFunction<
  typeof cleanSavedObjectIndices
>;

export const mockDeleteSavedObjectIndices = vi.fn() as MockedFunction<
  typeof deleteSavedObjectIndices
>;

export const mockIsSavedObjectIndex = vi.fn() as unknown as MockedFunction<
  typeof isSavedObjectIndex
>;

vi.mock('./kibana_index', () => ({
  cleanSavedObjectIndices: mockCleanSavedObjectIndices,
  deleteSavedObjectIndices: mockDeleteSavedObjectIndices,
  isSavedObjectIndex: mockIsSavedObjectIndex,
}));
