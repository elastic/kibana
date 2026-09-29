/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const readdirMock = vi.fn();
export const renameMock = vi.fn();
export const accessMock = vi.fn();

vi.doMock('fs/promises', () => {
  const mocked = {
    readdir: readdirMock,
    rename: renameMock,
    access: accessMock,
  };
  return { ...mocked, default: mocked };
});

export const clearAllMocks = () => {
  readdirMock.mockClear();
  renameMock.mockClear();
  accessMock.mockClear();
};
