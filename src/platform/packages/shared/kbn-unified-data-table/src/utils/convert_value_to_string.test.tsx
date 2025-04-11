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
  dataTableContextMock,
  dataTableContextRowsMock,
} from '../../__mocks__/table_context';
import { servicesMock } from '../../__mocks__/services';
import { convertValueToString, convertNameToString } from './convert_value_to_string';

describe('convertValueToString', () => {
  jest.spyOn(dataTableContextComplexMock.dataView.fields, 'create');

  it('should convert a keyword value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'keyword_key',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('abcd1');
  });

  it('should convert a text value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'text_message',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('"Hi there! I am a sample string."');
  });

  it('should convert a multiline text value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'text_message',
      rowIndex: 1,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('"I\'m multiline\n*&%$#@"');
    expect(result.withFormula).toBe(false);
  });

  it('should convert a number value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'number_price',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('10.99');
    expect(dataTableContextComplexMock.dataView.fields.create).toHaveBeenCalledTimes(0);
  });

  it('should convert a number value as keyword override to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'number_price',
      rowIndex: 0,
      columnsMeta: {
        number_price: {
          type: 'string',
          esType: 'keyword',
        },
      },
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('10.99');
    expect(dataTableContextComplexMock.dataView.fields.create).toHaveBeenCalledTimes(1);
  });

  it('should convert a date value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'date',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('"2022-05-22T12:10:30.000Z"');
  });

  it('should convert a date nanos value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'date_nanos',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('"2022-01-01T12:10:30.123456789Z"');
  });

  it('should convert a date nanos value to text (not for CSV)', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'date_nanos',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: false,
      },
    });

    expect(result.formattedString).toBe('2022-01-01T12:10:30.123456789Z');
  });

  it('should convert a boolean value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'bool_enabled',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('false');
  });

  it('should convert a binary value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'binary_blob',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('"U29tZSBiaW5hcnkgYmxvYg=="');
  });

  it('should convert a binary value to text (not for CSV)', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'binary_blob',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: false,
      },
    });

    expect(result.formattedString).toBe('U29tZSBiaW5hcnkgYmxvYg==');
  });

  it('should convert an object value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'object_user.first',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('John');
  });

  it('should convert a nested value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'nested_user',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe(
      '{"last":["Smith"],"last.keyword":["Smith"],"first":["John"],"first.keyword":["John"]}, {"last":["White"],"last.keyword":["White"],"first":["Alice"],"first.keyword":["Alice"]}'
    );
  });

  it('should convert a flattened value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'flattened_labels',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('{"release":["v1.2.5","v1.3.0"],"priority":"urgent"}');
  });

  it('should convert a range value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'range_time_frame',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe(
      '{"gte":"2015-10-31 12:00:00","lte":"2015-11-01 00:00:00"}'
    );
  });

  it('should convert a rank features value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'rank_features',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('{"2star":100,"1star":10}');
  });

  it('should convert a histogram value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'histogram',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('{"counts":[3,7,23,12,6],"values":[0.1,0.2,0.3,0.4,0.5]}');
  });

  it('should convert a IP value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'ip_addr',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('"192.168.1.1"');
  });

  it('should convert a IP value to text (not for CSV)', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'ip_addr',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: false,
      },
    });

    expect(result.formattedString).toBe('192.168.1.1');
  });

  it('should convert a version value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'version',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('"1.2.3"');
  });

  it('should convert a version value to text (not for CSV)', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'version',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: false,
      },
    });

    expect(result.formattedString).toBe('1.2.3');
  });

  it('should convert a vector value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'vector',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('0.5, 10, 6');
  });

  it('should convert a geo point value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'geo_point',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('{"coordinates":[-71.34,41.12],"type":"Point"}');
  });

  it('should convert a geo point object value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'geo_point',
      rowIndex: 1,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('{"coordinates":[-71.34,41.12],"type":"Point"}');
  });

  it('should convert an array value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'array_tags',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('elasticsearch, wow');
  });

  it('should convert a shape value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'geometry',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe(
      '{"coordinates":[[[1000,-1001],[1001,-1001],[1001,-1000],[1000,-1000],[1000,-1001]]],"type":"Polygon"}'
    );
  });

  it('should convert a runtime value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'runtime_number',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('5.5');
  });

  it('should convert a scripted value to text', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'scripted_string',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('"hi there"');
  });

  it('should convert a scripted value to text (not for CSV)', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'scripted_string',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: false,
      },
    });

    expect(result.formattedString).toBe('hi there');
  });

  it('should return an empty string and not fail', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'unknown',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('');
  });

  it('should return an empty string when rowIndex is out of range', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'unknown',
      rowIndex: -1,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('');
  });

  it('should return _source value', () => {
    const result = convertValueToString({
      rows: dataTableContextRowsMock,
      dataView: dataTableContextMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: '_source',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: false,
      },
    });

    expect(result.formattedString).toBe(
      '{\n' +
        '  "bytes": 20,\n' +
        '  "date": "2020-20-01T12:12:12.123",\n' +
        '  "message": "test1",\n' +
        '  "_index": "i",\n' +
        '  "_score": 1\n' +
        '}'
    );
  });

  it('should return a formatted _source value', () => {
    const result = convertValueToString({
      rows: dataTableContextRowsMock,
      dataView: dataTableContextMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: '_source',
      rowIndex: 0,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe(
      '{"bytes":20,"date":"2020-20-01T12:12:12.123","message":"test1","_index":"i","_score":1}'
    );
  });

  it('should escape formula', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'array_tags',
      rowIndex: 1,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result.formattedString).toBe('"\'=1+2\'"" ;,=1+2"');
    expect(result.withFormula).toBe(true);

    const result2 = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'scripted_string',
      rowIndex: 1,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: true,
      },
    });

    expect(result2.formattedString).toBe('"\'=1+2"";=1+2"');
    expect(result2.withFormula).toBe(true);
  });

  it('should not escape formulas when not for CSV', () => {
    const result = convertValueToString({
      rows: dataTableContextComplexRowsMock,
      dataView: dataTableContextComplexMock.dataView,
      fieldFormats: servicesMock.fieldFormats,
      columnId: 'array_tags',
      rowIndex: 1,
      columnsMeta: undefined,
      options: {
        compatibleWithCSV: false,
      },
    });

    expect(result.formattedString).toBe('=1+2\'" ;,=1+2');
    expect(result.withFormula).toBe(true);
  });

  it('should return a formatted name', () => {
    const result = convertNameToString('test');

    expect(result.formattedString).toBe('test');
    expect(result.withFormula).toBe(false);
  });

  it('should return a formatted name when with a formula', () => {
    const result = convertNameToString('=1+2";=1+2');

    expect(result.formattedString).toBe('"\'=1+2"";=1+2"');
    expect(result.withFormula).toBe(true);
  });
});
