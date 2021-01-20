/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const mockWriteFileAsync = jest.fn();
export const mockMakeDirAsync = jest.fn();
jest.mock('./utils', () => ({
  // Jest typings don't define `requireActual` for some reason.
  ...(jest as any).requireActual('./utils'),
  writeFileAsync: mockWriteFileAsync,
  makeDirAsync: mockMakeDirAsync,
}));
