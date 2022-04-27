/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { monaco } from '@kbn/monaco';
import { getHeight } from './get_height';

describe('getHeight', () => {
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 500 });

  const getMonacoMock = (lineCount: number) => {
    return {
      getDomNode: jest.fn(() => {
        return {
          getBoundingClientRect: jest.fn(() => {
            return {
              top: 200,
            };
          }),
        };
      }),
      getOption: jest.fn(() => 10),
      getModel: jest.fn(() => ({ getLineCount: jest.fn(() => lineCount) })),
      getTopForLineNumber: jest.fn((line) => line * 10),
    } as unknown as monaco.editor.IStandaloneCodeEditor;
  };
  test('when using document explorer, returning the available height in the flyout', () => {
    const monacoMock = getMonacoMock(500);

    const height = getHeight(monacoMock, true);
    expect(height).toBe(275);
  });

  test('when using classic table, its displayed inline without scrolling', () => {
    const monacoMock = getMonacoMock(100);

    const height = getHeight(monacoMock, false);
    expect(height).toBe(1020);
  });

  test('when using classic table, limited height > 500 lines to allow scrolling', () => {
    const monacoMock = getMonacoMock(1000);

    const height = getHeight(monacoMock, false);
    expect(height).toBe(5020);
  });
});
