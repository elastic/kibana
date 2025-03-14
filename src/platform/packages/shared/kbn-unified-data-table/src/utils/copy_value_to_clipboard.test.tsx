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
  copyValueToClipboard,
  copyColumnNameToClipboard,
  copyColumnValuesToClipboard,
  copyRowsAsTextToClipboard,
  copyRowsAsJsonToClipboard,
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

  beforeAll(() => {
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

  afterAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
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

  it('should copy column values to clipboard', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyColumnValuesToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columnId: 'bool_enabled',
      columnDisplayName: 'custom_bool_enabled',
      rowsCount: 2,
      valueToStringConverter,
    });

    expect(result).toBe('"custom_bool_enabled"\nfalse\ntrue');
    expect(global.window.navigator.clipboard.writeText).toHaveBeenCalledWith(
      '"custom_bool_enabled"\nfalse\ntrue'
    );
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

  it('should copy rows to clipboard as text', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyRowsAsTextToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columns: ['bool_enabled', 'keyword_key'],
      dataView: dataTableContextComplexMock.dataView,
      selectedRowIndices: [0],
      valueToStringConverter,
    });

    const output = '"bool_enabled"\t"keyword_key"\nfalse\tabcd1';
    expect(result).toBe(output);
    expect(global.window.navigator.clipboard.writeText).toHaveBeenCalledWith(output);
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });

  it('should copy rows to clipboard as text with a warning', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyRowsAsTextToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      columns: ['bool_enabled', 'scripted_string'],
      dataView: dataTableContextComplexMock.dataView,
      selectedRowIndices: [0, 1],
      valueToStringConverter,
    });

    const output = '"bool_enabled"\t"scripted_string"\nfalse\t"hi there"\ntrue\t"\'=1+2"";=1+2"';
    expect(result).toBe(output);
    expect(servicesMock.toastNotifications.addWarning).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
      text: 'Values may contain formulas that are escaped.',
    });
  });

  it('should copy rows to clipboard as JSON', async () => {
    execCommandMock.mockImplementationOnce(() => true);

    const result = await copyRowsAsJsonToClipboard({
      toastNotifications: servicesMock.toastNotifications,
      selectedRows: [dataTableContextComplexMock.getRowByIndex(0)!],
    });

    const output =
      '[{"_index":"sample","_id":"1","_version":2,"_score":null,"fields":{"date":["2022-05-22T12:10:30.000Z"],"array_objects.description.keyword":["programming list","cool stuff list"],"rank_features":[{"2star":100,"1star":10}],"array_tags":["elasticsearch","wow"],"array_objects.name.keyword":["prog_list","cool_list"],"flattened_labels":[{"release":["v1.2.5","v1.3.0"],"priority":"urgent"}],"geo_point":[{"coordinates":[-71.34,41.12],"type":"Point"}],"binary_blob":["U29tZSBiaW5hcnkgYmxvYg=="],"text_message":["Hi there! I am a sample string."],"object_user.first":["John"],"keyword_key":["abcd1"],"array_objects.name":["prog_list","cool_list"],"vector":[0.5,10,6],"nested_user":[{"last":["Smith"],"last.keyword":["Smith"],"first":["John"],"first.keyword":["John"]},{"last":["White"],"last.keyword":["White"],"first":["Alice"],"first.keyword":["Alice"]}],"number_amount":[50],"array_tags.keyword":["elasticsearch","wow"],"bool_enabled":[false],"version":["1.2.3"],"histogram":[{"counts":[3,7,23,12,6],"values":[0.1,0.2,0.3,0.4,0.5]}],"array_objects.description":["programming list","cool stuff list"],"range_time_frame":[{"gte":"2015-10-31 12:00:00","lte":"2015-11-01 00:00:00"}],"number_price":[10.99],"object_user.last":["Smith"],"geometry":[{"coordinates":[[[1000,-1001],[1001,-1001],[1001,-1000],[1000,-1000],[1000,-1001]]],"type":"Polygon"}],"date_nanos":["2022-01-01T12:10:30.123456789Z"],"ip_addr":["192.168.1.1"],"runtime_number":[5.5],"scripted_string":["hi there"]},"sort":[1653221430000]}]';
    expect(result).toBe(output);
    expect(global.window.navigator.clipboard.writeText).toHaveBeenCalledWith(output);
    expect(servicesMock.toastNotifications.addInfo).toHaveBeenCalledWith({
      title: 'Copied to clipboard',
    });
  });
});
