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

const execCommandMock = (global.document.execCommand = jest.fn());
const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('copyValueToClipboard', () => {
  const valueToStringConverter: ValueToStringConverter = (rowIndex, columnId, options) =>
    convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.dataView,
      fieldFormats: discoverServiceMock.fieldFormats,
      rowIndex,
      columnId,
      options,
    });

  const originalClipboard = global.window.navigator.clipboard;

  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(),
      },
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  it('should copy a value to clipboard', () => {
    execCommandMock.mockImplementationOnce(() => true);
    const result = copyValueToClipboard({
      toastNotifications: discoverServiceMock.toastNotifications,
      columnId: 'keyword_key',
      rowIndex: 0,
      valueToStringConverter,
    });

    expect(result).toBe('abcd1');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).not.toHaveBeenCalled();
    expect(discoverServiceMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });

  it('should inform when copy a value to clipboard failed', () => {
    execCommandMock.mockImplementationOnce(() => false);

    const result = copyValueToClipboard({
      toastNotifications: discoverServiceMock.toastNotifications,
      columnId: 'keyword_key',
      rowIndex: 0,
      valueToStringConverter,
    });

    expect(result).toBe(null);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).toHaveBeenCalledWith('Unable to copy to clipboard.');
    expect(discoverServiceMock.toastNotifications.addWarning).toHaveBeenCalledWith({
      title: 'Unable to copy to clipboard in this browser',
    });
  });

  it('should copy a column name to clipboard', () => {
    execCommandMock.mockImplementationOnce(() => true);
    const result = copyColumnNameToClipboard({
      toastNotifications: discoverServiceMock.toastNotifications,
      columnDisplayName: 'text_message',
    });

    expect(result).toBe('"text_message"');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(discoverServiceMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });

  it('should inform when copy a column name to clipboard failed', () => {
    execCommandMock.mockImplementationOnce(() => false);
    const result = copyColumnNameToClipboard({
      toastNotifications: discoverServiceMock.toastNotifications,
      columnDisplayName: 'text_message',
    });

    expect(result).toBe(null);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).toHaveBeenCalledWith('Unable to copy to clipboard.');
    expect(discoverServiceMock.toastNotifications.addWarning).toHaveBeenCalledWith({
      title: 'Unable to copy to clipboard in this browser',
    });
  });

  it('should copy column values to clipboard', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyColumnValuesToClipboard({
      toastNotifications: discoverServiceMock.toastNotifications,
      columnId: 'bool_enabled',
      columnDisplayName: 'custom_bool_enabled',
      rowsCount: 2,
      valueToStringConverter,
    });

    expect(result).toBe('"custom_bool_enabled"\nfalse\ntrue');
    expect(global.window.navigator.clipboard.writeText).toHaveBeenCalledWith(
      '"custom_bool_enabled"\nfalse\ntrue'
    );
    expect(discoverServiceMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Values of "custom_bool_enabled" column copied to clipboard',
    });
  });

  it('should copy column values to clipboard with a warning', async () => {
    execCommandMock.mockImplementationOnce(() => true);
    const result = await copyColumnValuesToClipboard({
      toastNotifications: discoverServiceMock.toastNotifications,
      columnId: 'scripted_string',
      columnDisplayName: 'custom_scripted_string',
      rowsCount: 2,
      valueToStringConverter,
    });

    expect(result).toBe('"custom_scripted_string"\n"hi there"\n"\'=1+2"";=1+2"');
    expect(discoverServiceMock.toastNotifications.addWarning).toHaveBeenCalledWith({
      title: 'Values of "custom_scripted_string" column copied to clipboard',
      text: 'Values may contain formulas that are escaped.',
    });
  });
});
