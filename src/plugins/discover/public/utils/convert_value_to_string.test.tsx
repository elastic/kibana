/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { discoverGridContextComplexMock, discoverGridContextMock } from '../__mocks__/grid_context';
import { discoverServiceMock } from '../__mocks__/services';
import { convertValueToString, convertNameToString } from './convert_value_to_string';

describe('convertValueToString', () => {
  it('should convert a keyword value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'keyword_key',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('abcd1');
  });

  it('should convert a text value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'text_message',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('"Hi there! I am a sample string."');
  });

  it('should convert a multiline text value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'text_message',
      rowIndex: 1,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('"I\'m multiline\n*&%$#@"');
    expect(result.withFormula).toBe(false);
  });

  it('should convert a number value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'number_price',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('10.99');
  });

  it('should convert a date value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'date',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('"2022-05-22T12:10:30.000Z"');
  });

  it('should convert a date nanos value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'date_nanos',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('"2022-01-01T12:10:30.123456789Z"');
  });

  it('should convert a boolean value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'bool_enabled',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('false');
  });

  it('should convert a binary value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'binary_blob',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('"U29tZSBiaW5hcnkgYmxvYg=="');
  });

  it('should convert an object value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'object_user.first',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('John');
  });

  it('should convert a nested value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'nested_user',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe(
      '{"last":["Smith"],"last.keyword":["Smith"],"first":["John"],"first.keyword":["John"]}, {"last":["White"],"last.keyword":["White"],"first":["Alice"],"first.keyword":["Alice"]}'
    );
  });

  it('should convert a flattened value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'flattened_labels',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('{"release":["v1.2.5","v1.3.0"],"priority":"urgent"}');
  });

  it('should convert a range value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'range_time_frame',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe(
      '{"gte":"2015-10-31 12:00:00","lte":"2015-11-01 00:00:00"}'
    );
  });

  it('should convert a rank features value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'rank_features',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('{"2star":100,"1star":10}');
  });

  it('should convert a histogram value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'histogram',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('{"counts":[3,7,23,12,6],"values":[0.1,0.2,0.3,0.4,0.5]}');
  });

  it('should convert a IP value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'ip_addr',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('"192.168.1.1"');
  });

  it('should convert a version value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'version',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('"1.2.3"');
  });

  it('should convert a vector value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'vector',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('0.5, 10, 6');
  });

  it('should convert a geo point value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'geo_point',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('{"coordinates":[-71.34,41.12],"type":"Point"}');
  });

  it('should convert a geo point object value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'geo_point',
      rowIndex: 1,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('{"coordinates":[-71.34,41.12],"type":"Point"}');
  });

  it('should convert an array value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'array_tags',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('elasticsearch, wow');
  });

  it('should convert a shape value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'geometry',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe(
      '{"coordinates":[[[1000,-1001],[1001,-1001],[1001,-1000],[1000,-1000],[1000,-1001]]],"type":"Polygon"}'
    );
  });

  it('should convert a runtime value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'runtime_number',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('5.5');
  });

  it('should convert a scripted value to text', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'scripted_string',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('"hi there"');
  });

  it('should return an empty string and not fail', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'unknown',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('');
  });

  it('should return an empty string when rowIndex is out of range', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'unknown',
      rowIndex: -1,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('');
  });

  it('should return _source value', () => {
    const result = convertValueToString({
      rows: discoverGridContextMock.rows,
      dataView: discoverGridContextMock.indexPattern,
      services: discoverServiceMock,
      columnId: '_source',
      rowIndex: 0,
      options: {
        disableMultiline: false,
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
      rows: discoverGridContextMock.rows,
      dataView: discoverGridContextMock.indexPattern,
      services: discoverServiceMock,
      columnId: '_source',
      rowIndex: 0,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe(
      '{"bytes":20,"date":"2020-20-01T12:12:12.123","message":"test1","_index":"i","_score":1}'
    );
  });

  it('should escape formula', () => {
    const result = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'array_tags',
      rowIndex: 1,
      options: {
        disableMultiline: true,
      },
    });

    expect(result.formattedString).toBe('"\'=1+2\'"" ;,=1+2"');
    expect(result.withFormula).toBe(true);

    const result2 = convertValueToString({
      rows: discoverGridContextComplexMock.rows,
      dataView: discoverGridContextComplexMock.indexPattern,
      services: discoverServiceMock,
      columnId: 'scripted_string',
      rowIndex: 1,
      options: {
        disableMultiline: true,
      },
    });

    expect(result2.formattedString).toBe('"\'=1+2"";=1+2"');
    expect(result2.withFormula).toBe(true);
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
