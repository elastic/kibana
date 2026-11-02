/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NULL_LABEL } from '@kbn/field-formats-common';
import { SourceFormat } from './source';
import { expectReactElementWithNull } from '../test_utils';

describe('Source Format', () => {
  test('should render stringified object', () => {
    const source = new SourceFormat({}, jest.fn());

    const hit = {
      foo: 'bar',
      number: 42,
      hello: '<h1>World</h1>',
      also: 'with "quotes" or \'single quotes\'',
    };

    expect(source.convertToText({ field: 'field', hit })).toBe(
      `{"field":"field","hit":{"foo":"bar","number":42,"hello":"<h1>World</h1>","also":"with \\"quotes\\" or 'single quotes'"}}`
    );
    expect(source.convertToReact({ field: 'field', hit })).toBe(
      `{"field":"field","hit":{"foo":"bar","number":42,"hello":"<h1>World</h1>","also":"with \\"quotes\\" or 'single quotes'"}}`
    );
  });

  test('returns a plain JSON string for an object', () => {
    const source = new SourceFormat({}, jest.fn());

    expect(source.convertToText({ foo: 'bar', n: 42 })).toBe('{"foo":"bar","n":42}');
    expect(source.convertToReact({ foo: 'bar', n: 42 })).toBe('{"foo":"bar","n":42}');
  });

  test('handles missing values', () => {
    const source = new SourceFormat({}, jest.fn());

    expect(source.convertToText(null)).toBe(NULL_LABEL);
    expect(source.convertToText(undefined)).toBe(NULL_LABEL);
    expectReactElementWithNull(source.convertToReact(null));
    expectReactElementWithNull(source.convertToReact(undefined));
  });

  test('returns the single element without brackets for a one-element array', () => {
    const source = new SourceFormat({}, jest.fn());

    expect(source.convertToText([{ foo: 'bar' }])).toBe('["{\\"foo\\":\\"bar\\"}"]');
    expect(source.convertToReact([{ foo: 'bar' }])).toBe('{"foo":"bar"}');
  });
});
