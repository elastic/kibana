/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { discoverGridContextComplexMock } from '../__mocks__/grid_context';
import { discoverServiceMock } from '../__mocks__/services';
import {
  copyValueToClipboard,
  copyColumnNameToClipboard,
  copyColumnValuesToClipboard,
} from './copy_value_to_clipboard';
import { convertValueToString } from './convert_value_to_string';
import type { ValueToStringConverter } from '../types';

const execCommandMock = (global.document.execCommand = jest.fn(() => true));

describe('copyValueToClipboard', () => {
  const valueToStringConverter: ValueToStringConverter = (rowIndex, columnId, options) =>
    convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      rowIndex,
      columnId,
      options,
    });

  it('should copy a value to clipboard', () => {
    const result = copyValueToClipboard({
      services: discoverServiceMock,
      columnId: 'keyword_key',
      rowIndex: 0,
      valueToStringConverter,
    });

    expect(result).toBe('"abcd1"');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(discoverServiceMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard.',
    });
  });

  it('should copy a column name to clipboard', () => {
    const result = copyColumnNameToClipboard({
      services: discoverServiceMock,
      columnId: 'text_message',
    });

    expect(result).toBe('text_message');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(discoverServiceMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard.',
    });
  });

  it('should copy column values to clipboard', async () => {
    const originalClipboard = global.window.navigator.clipboard;

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(),
      },
      writable: true,
    });

    const result = await copyColumnValuesToClipboard({
      services: discoverServiceMock,
      columnId: 'bool_enabled',
      rowsCount: 2,
      valueToStringConverter,
    });

    expect(result).toBe('bool_enabled\nfalse\ntrue');
    expect(discoverServiceMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied values of "bool_enabled" column to clipboard.',
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });
});
