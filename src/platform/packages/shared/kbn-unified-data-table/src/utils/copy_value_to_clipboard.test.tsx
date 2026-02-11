/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  dataTableContextComplexMock,
  dataTableContextComplexRowsMock,
} from '../../__mocks__/table_context';
import { servicesMock } from '../../__mocks__/services';
import {
  CopyAsTextFormat,
  copyColumnNameToClipboard,
  copyColumnValuesToClipboard,
  copyRowsAsJsonToClipboard,
  copyRowsAsTextToClipboard,
  copyValueToClipboard,
} from './copy_value_to_clipboard';
import { convertValueToString } from './convert_value_to_string';
import type { ValueToStringConverter } from '../types';

const execCommandMock = (global.document.execCommand = jest.fn());
const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('copyValueToClipboard', () => {
  const valueToStringConverter: ValueToStringConverter = (rowIndex, columnId, options) =>
    convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      rowIndex,
      columnId,
      columnsMeta: undefined,
      options,
    });

  const originalClipboard = global.window.navigator.clipboard;

  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(),
      },
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: { clear: jest.fn() },
      writable: true,
    });
  });

  afterEach(() => {
    execCommandMock.mockReset();
    warn.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
    (servicesMock.toastNotifications.addInfo as jest.Mock).mockReset();
    (servicesMock.toastNotifications.addWarning as jest.Mock).mockReset();
  });

  it('should copy a value to clipboard', () => {
    execCommandMock.mockImplementationOnce(() => true);
    const result = copyValueToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columnId: 'keyword_key',
      rowIndex: 0,
      valueToStringConverter,
    });

    expect(result).toBe('abcd1');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).not.toHaveBeenCalled();
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });

  it('should inform when copy a value to clipboard failed', () => {
    execCommandMock.mockImplementationOnce(() => false);

    const result = copyValueToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columnId: 'keyword_key',
      rowIndex: 0,
      valueToStringConverter,
    });

    expect(result).toBe(null);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).toHaveBeenCalledWith('Unable to copy to clipboard.');
    expect(servicesMock.toastNotifications.addWarning).toHaveBeenCalledWith({
      title: 'Unable to copy to clipboard in this browser',
    });
  });

  it('should copy a column name to clipboard', () => {
    execCommandMock.mockImplementationOnce(() => true);
    const result = copyColumnNameToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columnDisplayName: 'text_message',
    });

    expect(result).toBe('text_message');
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });

  it('should inform when copy a column name to clipboard failed', () => {
    execCommandMock.mockImplementationOnce(() => false);
    const result = copyColumnNameToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columnDisplayName: 'text_message',
    });

    expect(result).toBe(null);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).toHaveBeenCalledWith('Unable to copy to clipboard.');
    expect(servicesMock.toastNotifications.addWarning).toHaveBeenCalledWith({
      title: 'Unable to copy to clipboard in this browser',
    });
  });

  const valuesOutput = '"custom_bool_enabled"\nfalse\ntrue';

  it('should copy column values to clipboard when Clipboard API is available', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyColumnValuesToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columnId: 'bool_enabled',
      columnDisplayName: 'custom_bool_enabled',
      rowsCount: 2,
      valueToStringConverter,
    });

    expect(result).toBe(valuesOutput);
    expect(global.window.navigator.clipboard.writeText).toHaveBeenCalledWith(valuesOutput);
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Values of "custom_bool_enabled" column copied to clipboard',
    });
  });

  it('should copy column values to clipboard when Clipboard API is not available', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyColumnValuesToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columnId: 'bool_enabled',
      columnDisplayName: 'custom_bool_enabled',
      rowsCount: 2,
      valueToStringConverter,
    });

    expect(result).toBe(valuesOutput);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).not.toHaveBeenCalled();
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Values of "custom_bool_enabled" column copied to clipboard',
    });
  });

  it('should copy column values to clipboard with a warning', async () => {
    execCommandMock.mockImplementationOnce(() => true);
    const result = await copyColumnValuesToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columnId: 'scripted_string',
      columnDisplayName: 'custom_scripted_string',
      rowsCount: 2,
      valueToStringConverter,
    });

    expect(result).toBe('"custom_scripted_string"\n"hi there"\n"\'=1+2"";=1+2"');
    expect(servicesMock.toastNotifications.addWarning).toHaveBeenCalledWith({
      title: 'Values of "custom_scripted_string" column copied to clipboard',
      text: 'Values may contain formulas that are escaped.',
    });
  });

  const textOutputTabular = '"bool_enabled"\t"keyword_key"\nfalse\tabcd1';
  const textOutputEscapedTabular = `"text_message"\n"Hi there! I am a sample string."\n"I'm multiline\n*&%$\\#|@"`;
  const textOutputMarkdown = `| bool_enabled | keyword_key |
| --- | --- |
| false | abcd1 |`;
  const textOutputEscapedMarkdown = `| text_message |
| --- |
| Hi there! I am a sample string. |
| I'm multiline *&%$\\\\#\\|@ |`;
  describe.each([
    [CopyAsTextFormat.tabular, textOutputTabular, textOutputEscapedTabular],
    [CopyAsTextFormat.markdown, textOutputMarkdown, textOutputEscapedMarkdown],
  ])('copyRowsAsTextToClipboard format: %s', (format, textOutput, textOutputEscaped) => {
    it('should copy rows to clipboard as text when Clipboard API is available', async () => {
      execCommandMock.mockImplementationOnce(() => true);

      const result = await copyRowsAsTextToClipboard({
        format,
        toastNotifications: servicesMock.toastNotifications,
        columns: ['bool_enabled', 'keyword_key'],
        dataView: dataTableContextComplexMock.dataView,
        selectedRowIndices: [0],
        valueToStringConverter,
      });

      expect(result).toBe(textOutput);
      expect(global.window.navigator.clipboard.writeText).toHaveBeenCalledWith(textOutput);
      expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
        title: 'Copied to clipboard',
      });
    });

    it('should copy rows to clipboard as text when Clipboard API is not available', async () => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined });
      execCommandMock.mockImplementationOnce(() => true);

      const result = await copyRowsAsTextToClipboard({
        format,
        toastNotifications: servicesMock.toastNotifications,
        columns: ['bool_enabled', 'keyword_key'],
        dataView: dataTableContextComplexMock.dataView,
        selectedRowIndices: [0],
        valueToStringConverter,
      });

      expect(result).toBe(textOutput);
      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(warn).not.toHaveBeenCalled();
      expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
        title: 'Copied to clipboard',
      });
    });

    it('should copy escape values correctly', async () => {
      execCommandMock.mockImplementationOnce(() => true);

      const result = await copyRowsAsTextToClipboard({
        format,
        toastNotifications: servicesMock.toastNotifications,
        columns: ['text_message'],
        dataView: dataTableContextComplexMock.dataView,
        selectedRowIndices: [0, 1],
        valueToStringConverter,
      });

      expect(result).toBe(textOutputEscaped);
      expect(global.window.navigator.clipboard.writeText).toHaveBeenCalledWith(textOutputEscaped);
      expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
        title: 'Copied to clipboard',
      });
    });
  });

  it('should copy rows to clipboard as text with a warning for tabular format', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyRowsAsTextToClipboard({
      format: CopyAsTextFormat.tabular,
      toastNotifications: servicesMock.toastNotifications,
      columns: ['bool_enabled', 'scripted_string'],
      dataView: dataTableContextComplexMock.dataView,
      selectedRowIndices: [0, 1],
      valueToStringConverter,
    });

    const textOutputWithFormulas =
      '"bool_enabled"\t"scripted_string"\nfalse\t"hi there"\ntrue\t"\'=1+2"";=1+2"';
    expect(result).toBe(textOutputWithFormulas);
    expect(servicesMock.toastNotifications.addWarning).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
      text: 'Values may contain formulas that are escaped.',
    });
  });

  it('should copy rows to clipboard as text without a warning for markdown format', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyRowsAsTextToClipboard({
      format: CopyAsTextFormat.markdown,
      toastNotifications: servicesMock.toastNotifications,
      columns: ['bool_enabled', 'scripted_string'],
      dataView: dataTableContextComplexMock.dataView,
      selectedRowIndices: [0, 1],
      valueToStringConverter,
    });

    const textOutputWithFormulas = `| bool_enabled | scripted_string |
| --- | --- |
| false | hi there |
| true | =1+2";=1+2 |`;
    expect(result).toBe(textOutputWithFormulas);
    expect(servicesMock.toastNotifications.addWarning).not.toHaveBeenCalled();
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });

  const jsonOutput =
    '[{"_index":"sample","_id":"1","_version":2,"_score":null,"fields":{"date":["2022-05-22T12:10:30.000Z"],"array_objects.description.keyword":["programming list","cool stuff list"],"rank_features":[{"2star":100,"1star":10}],"array_tags":["elasticsearch","wow"],"array_objects.name.keyword":["prog_list","cool_list"],"flattened_labels":[{"release":["v1.2.5","v1.3.0"],"priority":"urgent"}],"geo_point":[{"coordinates":[-71.34,41.12],"type":"Point"}],"binary_blob":["U29tZSBiaW5hcnkgYmxvYg=="],"text_message":["Hi there! I am a sample string."],"object_user.first":["John"],"keyword_key":["abcd1"],"array_objects.name":["prog_list","cool_list"],"vector":[0.5,10,6],"nested_user":[{"last":["Smith"],"last.keyword":["Smith"],"first":["John"],"first.keyword":["John"]},{"last":["White"],"last.keyword":["White"],"first":["Alice"],"first.keyword":["Alice"]}],"number_amount":[50],"array_tags.keyword":["elasticsearch","wow"],"bool_enabled":[false],"version":["1.2.3"],"histogram":[{"counts":[3,7,23,12,6],"values":[0.1,0.2,0.3,0.4,0.5]}],"array_objects.description":["programming list","cool stuff list"],"range_time_frame":[{"gte":"2015-10-31 12:00:00","lte":"2015-11-01 00:00:00"}],"number_price":[10.99],"object_user.last":["Smith"],"geometry":[{"coordinates":[[[1000,-1001],[1001,-1001],[1001,-1000],[1000,-1000],[1000,-1001]]],"type":"Polygon"}],"date_nanos":["2022-01-01T12:10:30.123456789Z"],"ip_addr":["192.168.1.1"],"runtime_number":[5.5],"scripted_string":["hi there"]},"sort":[1653221430000]}]';

  it('should copy rows to clipboard as JSON when Clipboard API is available', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyRowsAsJsonToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      selectedRows: [dataTableContextComplexMock.getRowByIndex(0)!],
    });

    expect(result).toBe(jsonOutput);
    expect(global.window.navigator.clipboard.writeText).toHaveBeenCalledWith(jsonOutput);
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });

  it('should copy rows to clipboard as JSON when Clipboard API is not available', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined });
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyRowsAsJsonToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      selectedRows: [dataTableContextComplexMock.getRowByIndex(0)!],
    });

    expect(result).toBe(jsonOutput);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
    expect(warn).not.toHaveBeenCalled();
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });
});
