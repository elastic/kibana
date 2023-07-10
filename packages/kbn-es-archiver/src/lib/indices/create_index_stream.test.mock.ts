/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { cleanSavedObjectIndices, deleteSavedObjectIndices } from './kibana_index';

export const mockCleanSavedObjectIndices = jest.fn() as jest.MockedFunction<
  typeof cleanSavedObjectIndices
>;

export const mockDeleteSavedObjectIndices = jest.fn() as jest.MockedFunction<
  typeof deleteSavedObjectIndices
>;

jest.mock('./kibana_index', () => ({
  cleanSavedObjectIndices: mockCleanSavedObjectIndices,
  deleteSavedObjectIndices: mockDeleteSavedObjectIndices,
}));
