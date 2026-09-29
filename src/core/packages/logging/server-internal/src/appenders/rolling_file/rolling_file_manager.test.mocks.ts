/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const mockCreateWriteStream = vi.fn();
export const mockMkdirSync = vi.fn();
vi.mock('fs', () => {
      const mocked = { createWriteStream: mockCreateWriteStream, mkdirSync: mockMkdirSync };
      return { ...mocked, default: mocked };
    });

export const resetAllMocks = () => {
  mockCreateWriteStream.mockReset();
  mockMkdirSync.mockReset();
};
