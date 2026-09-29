/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const getOrderedRolledFilesMock = vi.fn();
export const rollPreviousFilesInOrderMock = vi.fn();
export const rollCurrentFileMock = vi.fn();
export const shouldSkipRolloutMock = vi.fn();

vi.doMock('./rolling_tasks', () => {
      const mocked = {
      getOrderedRolledFiles: getOrderedRolledFilesMock,
      rollPreviousFilesInOrder: rollPreviousFilesInOrderMock,
      rollCurrentFile: rollCurrentFileMock,
      shouldSkipRollout: shouldSkipRolloutMock,
    };
      return { ...mocked, default: mocked };
    });

export const resetAllMock = () => {
  shouldSkipRolloutMock.mockReset();
  getOrderedRolledFilesMock.mockReset();
  rollPreviousFilesInOrderMock.mockReset();
  rollCurrentFileMock.mockReset();
};
