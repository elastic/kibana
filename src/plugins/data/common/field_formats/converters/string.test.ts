/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { StringFormat } from './string';

describe('String Format', () => {
  test('convert a string to lower case', () => {
    const string = new StringFormat(
      {
        transform: 'lower',
      },
      jest.fn()
    );
    expect(string.convert('Kibana')).toBe('kibana');
  });

  test('convert a string to upper case', () => {
    const string = new StringFormat(
      {
        transform: 'upper',
      },
      jest.fn()
    );
    expect(string.convert('Kibana')).toBe('KIBANA');
  });

  test('decode a base64 string', () => {
    const string = new StringFormat(
      {
        transform: 'base64',
      },
      jest.fn()
    );
    expect(string.convert('Zm9vYmFy')).toBe('foobar');
  });

  test('convert a string to title case', () => {
    const string = new StringFormat(
      {
        transform: 'title',
      },
      jest.fn()
    );
    expect(string.convert('PLEASE DO NOT SHOUT')).toBe('Please Do Not Shout');
    expect(string.convert('Mean, variance and standard_deviation.')).toBe(
      'Mean, Variance And Standard_deviation.'
    );
    expect(string.convert('Stay CALM!')).toBe('Stay Calm!');
  });

  test('convert a string to short case', () => {
    const string = new StringFormat(
      {
        transform: 'short',
      },
      jest.fn()
    );
    expect(string.convert('dot.notated.string')).toBe('d.n.string');
  });

  test('convert a string to unknown transform case', () => {
    const string = new StringFormat(
      {
        transform: 'unknown_transform',
      },
      jest.fn()
    );
    const value = 'test test test';
    expect(string.convert(value)).toBe(value);
  });

  test('decode a URL Param string', () => {
    const string = new StringFormat(
      {
        transform: 'urlparam',
      },
      jest.fn()
    );
    expect(string.convert('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98')).toBe('안녕 키바나');
  });
});
