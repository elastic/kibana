/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EMPTY_LABEL, NULL_LABEL } from '@kbn/field-formats-common';
import { StringFormat } from './string';
import {
  expectReactElementWithNull,
  expectReactElementWithBlank,
  expectReactElementAsArray,
} from '../test_utils';

describe('String Format', () => {
  test('convert a string to lower case', () => {
    const string = new StringFormat(
      {
        transform: 'lower',
      },
      jest.fn()
    );
    expect(string.convertToText('Kibana')).toBe('kibana');
    expect(string.convertToReact('Kibana')).toBe('kibana');
  });

  test('convert a string to upper case', () => {
    const string = new StringFormat(
      {
        transform: 'upper',
      },
      jest.fn()
    );
    expect(string.convertToText('Kibana')).toBe('KIBANA');
    expect(string.convertToReact('Kibana')).toBe('KIBANA');
  });

  test('decode a base64 string', () => {
    const string = new StringFormat(
      {
        transform: 'base64',
      },
      jest.fn()
    );
    expect(string.convertToText('Zm9vYmFy')).toBe('foobar');
    expect(string.convertToReact('Zm9vYmFy')).toBe('foobar');
  });

  test('convert a string to title case', () => {
    const string = new StringFormat(
      {
        transform: 'title',
      },
      jest.fn()
    );
    expect(string.convertToText('PLEASE DO NOT SHOUT')).toBe('Please Do Not Shout');
    expect(string.convertToReact('PLEASE DO NOT SHOUT')).toBe('Please Do Not Shout');
    expect(string.convertToText('Mean, variance and standard_deviation.')).toBe(
      'Mean, Variance And Standard_deviation.'
    );
    expect(string.convertToReact('Mean, variance and standard_deviation.')).toBe(
      'Mean, Variance And Standard_deviation.'
    );
    expect(string.convertToText('Stay CALM!')).toBe('Stay Calm!');
    expect(string.convertToReact('Stay CALM!')).toBe('Stay Calm!');
  });

  test('convert a string to short case', () => {
    const string = new StringFormat(
      {
        transform: 'short',
      },
      jest.fn()
    );
    expect(string.convertToText('dot.notated.string')).toBe('d.n.string');
    expect(string.convertToReact('dot.notated.string')).toBe('d.n.string');
  });

  test('convert a string to unknown transform case', () => {
    const string = new StringFormat(
      {
        transform: 'unknown_transform',
      },
      jest.fn()
    );
    const value = 'test test test';
    expect(string.convertToText(value)).toBe(value);
    expect(string.convertToReact(value)).toBe(value);
  });

  test('decode a URL Param string', () => {
    const string = new StringFormat(
      {
        transform: 'urlparam',
      },
      jest.fn()
    );
    expect(
      string.convertToText('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98')
    ).toBe('안녕 키바나');
    expect(string.convertToReact('%EC%95%88%EB%85%95%20%ED%82%A4%EB%B0%94%EB%82%98')).toBe(
      '안녕 키바나'
    );
  });

  test('outputs specific empty value', () => {
    const string = new StringFormat();
    expect(string.convertToText('')).toBe(EMPTY_LABEL);
    expectReactElementWithBlank(string.convertToReact(''));
  });

  test('outputs specific missing value', () => {
    const string = new StringFormat();
    expect(string.convertToText(null)).toBe(NULL_LABEL);
    expect(string.convertToText(undefined)).toBe(NULL_LABEL);
    expectReactElementWithNull(string.convertToReact(null));
    expectReactElementWithNull(string.convertToReact(undefined));
  });

  test('does escape value while highlighting', () => {
    const string = new StringFormat();
    const options = {
      field: { name: 'foo' },
      hit: {
        highlight: { foo: ['@kibana-highlighted-field@<img />@/kibana-highlighted-field@'] },
      },
    };
    expect(string.convertToReact('<img />', options)).toMatchInlineSnapshot(`
      <mark
        className="ffSearch__highlight"
      >
        &lt;img /&gt;
      </mark>
    `);
  });

  test('convertToReact returns raw string for unhighlighted content (React escapes at render)', () => {
    expect(new StringFormat().convertToReact('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
  });

  test('wraps a multi-value array with bracket notation', () => {
    const string = new StringFormat();

    expect(string.convertToText(['foo', 'bar'])).toBe('["foo","bar"]');
    expectReactElementAsArray(string.convertToReact(['foo', 'bar']), ['foo', 'bar']);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const string = new StringFormat();

    expect(string.convertToText(['hello'])).toBe('["hello"]');
    expect(string.convertToReact(['hello'])).toBe('hello');
  });

  test('returns empty for an empty array', () => {
    const string = new StringFormat();

    expect(string.convertToText([])).toBe('[]');
    expect(string.convertToReact([])).toBe('');
  });
});
