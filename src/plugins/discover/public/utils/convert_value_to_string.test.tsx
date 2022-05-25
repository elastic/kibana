/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { discoverGridContextComplexMock, discoverGridContextMock } from '../__mocks__/grid_context';
import { discoverServiceMock } from '../__mocks__/services';
import { convertValueToString } from './convert_value_to_string';

describe('convertValueToString', () => {
  it('should convert a keyword value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'keyword_key',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('abcd1');
  });

  it('should convert a text value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'text_message',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('Hi there! I am a sample string.');
  });

  // TODO: add a test for a multiline text

  it('should convert a number value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'number_price',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('10.99');
  });

  it('should convert a date value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'date',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('2015-01-01T12:10:30.000Z');
  });

  it('should convert a boolean value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'bool_enabled',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('false');
  });

  it('should convert a binary value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'binary_blob',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('U29tZSBiaW5hcnkgYmxvYg==');
  });

  it('should convert an object value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'object_user.first',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('John');
  });

  it('should convert a nested value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'nested_user',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe(
      '{"last":["Smith"],"last.keyword":["Smith"],"first":["John"],"first.keyword":["John"]}, {"last":["White"],"last.keyword":["White"],"first":["Alice"],"first.keyword":["Alice"]}'
    );
  });

  it('should convert a flattened value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'flattened_labels',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('{"release":["v1.2.5","v1.3.0"],"priority":"urgent"}');
  });

  it('should convert a range value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'range_time_frame',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('{"gte":"2015-10-31 12:00:00","lte":"2015-11-01 00:00:00"}');
  });

  it('should convert a IP value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'ip_addr',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('192.168.1.1');
  });

  it('should convert a version value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'version',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('1.2.3');
  });

  it('should convert a vector value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'vector',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('0.5, 10, 6');
  });

  it('should convert a geo point value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'geo_point',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('{"coordinates":[-71.34,41.12],"type":"Point"}');
  });

  it('should convert a geo point object value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'geo_point',
      rowIndex: 1,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('{"coordinates":[-71.34,41.12],"type":"Point"}');
  });

  it('should convert an array value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'array_tags',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('elasticsearch, wow');
  });

  it('should convert a runtime value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'runtime_number',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('5.5');
  });

  it('should convert a scripted value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'scripted_string',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('hi there');
  });

  it('should return an empty string and not fail', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      rowsFlattened: discoverGridContextComplexMock.rowsFlattened,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'unknown',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe('');
  });

  it('should return _source value', () => {
    const result = convertValueToString({
      rows: discoverGridContextMock.rows,
      rowsFlattened: discoverGridContextMock.rowsFlattened,
      dataView: discoverGridContextMock.indexPattern,
      services: discoverServiceMock,
      columnId: '_source',
      rowIndex: 0,
    });

    expect(result).toBe(
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
      rows: discoverGridContextMock.rows,
      rowsFlattened: discoverGridContextMock.rowsFlattened,
      dataView: discoverGridContextMock.indexPattern,
      services: discoverServiceMock,
      columnId: '_source',
      rowIndex: 0,
      options: {
        allowMultiline: false,
      },
    });

    expect(result).toBe(
      '{"bytes":20,"date":"2020-20-01T12:12:12.123","message":"test1","_index":"i","_score":1}'
    );
  });
});
