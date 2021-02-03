/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const mockPlugin = {
  setup: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
};
export const mockInitializer = jest.fn(() => mockPlugin);

export const mockPluginReader = jest.fn(() => mockInitializer);

jest.mock('./plugin_reader', () => ({
  read: mockPluginReader,
}));
