/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import type { monaco } from '@kbn/monaco';
import { getHeight, DEFAULT_MARGIN_BOTTOM } from './get_height';

describe('getHeight', () => {
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 500 });

  const getMonacoMock = (lineCount: number, top: number = 200) => {
    return {
      getDomNode: vi.fn(() => {
        return {
          getBoundingClientRect: vi.fn(() => {
            return {
              top,
            };
          }),
        };
      }),
      getOption: vi.fn(() => 10),
      getModel: vi.fn(() => ({ getLineCount: vi.fn(() => lineCount) })),
      getTopForLineNumber: vi.fn((line) => line * 10),
    } as unknown as monaco.editor.IStandaloneCodeEditor;
  };
  test('when using document explorer, returning the available height in the flyout', () => {
    const monacoMock = getMonacoMock(500, 0);

    const height = getHeight(monacoMock, DEFAULT_MARGIN_BOTTOM);
    expect(height).toBe(484);

    const heightCustom = getHeight(monacoMock, 80);
    expect(heightCustom).toBe(420);
  });

  test('when using document explorer, returning the available height in the flyout has a minimun guarenteed height', () => {
    const monacoMock = getMonacoMock(500);

    const height = getHeight(monacoMock, DEFAULT_MARGIN_BOTTOM);
    expect(height).toBe(400);
  });
});
