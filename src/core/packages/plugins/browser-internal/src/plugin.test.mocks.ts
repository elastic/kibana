/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { read } from './plugin_reader';

export const mockPlugin = {
  setup: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
};
export const mockInitializer = vi.fn(() => mockPlugin);

export const mockPluginReader = vi.fn((() => ({
  plugin: mockInitializer,
})) as typeof read);

vi.mock('./plugin_reader', () => {
      const mocked = {
      read: mockPluginReader,
    };
      return { ...mocked, default: mocked };
    });
