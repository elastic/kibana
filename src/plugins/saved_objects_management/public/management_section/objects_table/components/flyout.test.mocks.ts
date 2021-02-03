/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const importFileMock = jest.fn();
jest.doMock('../../../lib/import_file', () => ({
  importFile: importFileMock,
}));

export const resolveImportErrorsMock = jest.fn();
jest.doMock('../../../lib/resolve_import_errors', () => ({
  resolveImportErrors: resolveImportErrorsMock,
}));

export const importLegacyFileMock = jest.fn();
jest.doMock('../../../lib/import_legacy_file', () => ({
  importLegacyFile: importLegacyFileMock,
}));

export const resolveSavedObjectsMock = jest.fn();
export const resolveSavedSearchesMock = jest.fn();
export const resolveIndexPatternConflictsMock = jest.fn();
export const saveObjectsMock = jest.fn();
jest.doMock('../../../lib/resolve_saved_objects', () => ({
  resolveSavedObjects: resolveSavedObjectsMock,
  resolveSavedSearches: resolveSavedSearchesMock,
  resolveIndexPatternConflicts: resolveIndexPatternConflictsMock,
  saveObjects: saveObjectsMock,
}));
