/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const getOrderedRolledFilesMock = jest.fn();
export const deleteFilesMock = jest.fn();
export const rollPreviousFilesInOrderMock = jest.fn();
export const rollCurrentFileMock = jest.fn();
export const shouldSkipRolloutMock = jest.fn();

jest.doMock('./rolling_tasks', () => ({
  getOrderedRolledFiles: getOrderedRolledFilesMock,
  deleteFiles: deleteFilesMock,
  rollPreviousFilesInOrder: rollPreviousFilesInOrderMock,
  rollCurrentFile: rollCurrentFileMock,
  shouldSkipRollout: shouldSkipRolloutMock,
}));

export const resetAllMock = () => {
  shouldSkipRolloutMock.mockReset();
  getOrderedRolledFilesMock.mockReset();
  deleteFilesMock.mockReset();
  rollPreviousFilesInOrderMock.mockReset();
  rollCurrentFileMock.mockReset();
};
