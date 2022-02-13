/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { checkReferenceOrigins } from './lib/check_reference_origins';
import type { validateRetries } from './lib/validate_retries';
import type { createObjectsFilter } from './lib/create_objects_filter';
import type { collectSavedObjects } from './lib/collect_saved_objects';
import type { regenerateIds } from './lib/regenerate_ids';
import type { validateReferences } from './lib/validate_references';
import type { checkConflicts } from './lib/check_conflicts';
import type { checkOriginConflicts } from './lib/check_origin_conflicts';
import type { getImportStateMapForRetries } from './lib/get_import_state_map_for_retries';
import type { splitOverwrites } from './lib/split_overwrites';
import type { createSavedObjects } from './lib/create_saved_objects';
import type { executeImportHooks } from './lib/execute_import_hooks';

export const mockCheckReferenceOrigins = jest.fn() as jest.MockedFunction<
  typeof checkReferenceOrigins
>;
jest.mock('./lib/check_reference_origins', () => ({
  checkReferenceOrigins: mockCheckReferenceOrigins,
}));

export const mockValidateRetries = jest.fn() as jest.MockedFunction<typeof validateRetries>;
jest.mock('./lib/validate_retries', () => ({
  validateRetries: mockValidateRetries,
}));

export const mockCreateObjectsFilter = jest.fn() as jest.MockedFunction<typeof createObjectsFilter>;
jest.mock('./lib/create_objects_filter', () => ({
  createObjectsFilter: mockCreateObjectsFilter,
}));

export const mockCollectSavedObjects = jest.fn() as jest.MockedFunction<typeof collectSavedObjects>;
jest.mock('./lib/collect_saved_objects', () => ({
  collectSavedObjects: mockCollectSavedObjects,
}));

export const mockRegenerateIds = jest.fn() as jest.MockedFunction<typeof regenerateIds>;
jest.mock('./lib/regenerate_ids', () => ({
  regenerateIds: mockRegenerateIds,
}));

export const mockValidateReferences = jest.fn() as jest.MockedFunction<typeof validateReferences>;
jest.mock('./lib/validate_references', () => ({
  validateReferences: mockValidateReferences,
}));

export const mockCheckConflicts = jest.fn() as jest.MockedFunction<typeof checkConflicts>;
jest.mock('./lib/check_conflicts', () => ({
  checkConflicts: mockCheckConflicts,
}));

export const mockCheckOriginConflicts = jest.fn() as jest.MockedFunction<
  typeof checkOriginConflicts
>;
jest.mock('./lib/check_origin_conflicts', () => ({
  checkOriginConflicts: mockCheckOriginConflicts,
}));

export const mockGetImportStateMapForRetries = jest.fn() as jest.MockedFunction<
  typeof getImportStateMapForRetries
>;
jest.mock('./lib/get_import_state_map_for_retries', () => ({
  getImportStateMapForRetries: mockGetImportStateMapForRetries,
}));

export const mockSplitOverwrites = jest.fn() as jest.MockedFunction<typeof splitOverwrites>;
jest.mock('./lib/split_overwrites', () => ({
  splitOverwrites: mockSplitOverwrites,
}));

export const mockCreateSavedObjects = jest.fn() as jest.MockedFunction<typeof createSavedObjects>;
jest.mock('./lib/create_saved_objects', () => ({
  createSavedObjects: mockCreateSavedObjects,
}));

export const mockExecuteImportHooks = jest.fn() as jest.MockedFunction<typeof executeImportHooks>;
jest.mock('./lib/execute_import_hooks', () => ({
  executeImportHooks: mockExecuteImportHooks,
}));
