/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const readdirMock = jest.fn();
export const unlinkMock = jest.fn();
export const renameMock = jest.fn();
export const accessMock = jest.fn();

jest.doMock('fs/promises', () => ({
  readdir: readdirMock,
  unlink: unlinkMock,
  rename: renameMock,
  access: accessMock,
}));

export const clearAllMocks = () => {
  readdirMock.mockClear();
  unlinkMock.mockClear();
  renameMock.mockClear();
  accessMock.mockClear();
};
