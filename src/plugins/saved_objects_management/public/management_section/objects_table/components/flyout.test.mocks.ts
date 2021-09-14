/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const importFileMock = jest.fn();
jest.doMock('../../../lib/import_file', () => ({
  importFile: importFileMock,
}));

export const resolveImportErrorsMock = jest.fn();
jest.doMock('../../../lib/resolve_import_errors', () => ({
  resolveImportErrors: resolveImportErrorsMock,
}));
