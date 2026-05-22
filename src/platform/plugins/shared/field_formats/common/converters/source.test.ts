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
import { TEXT_CONTEXT_TYPE } from '../content_types';
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

    expect(source.convert({ field: 'field', hit }, TEXT_CONTEXT_TYPE)).toBe(
      `{"field":"field","hit":{"foo":"bar","number":42,"hello":"<h1>World</h1>","also":"with \\"quotes\\" or 'single quotes'"}}`
    );
    expect(source.reactConvert({ field: 'field', hit })).toBe(
      `{"field":"field","hit":{"foo":"bar","number":42,"hello":"<h1>World</h1>","also":"with \\"quotes\\" or 'single quotes'"}}`
    );
  });

  test('returns a plain JSON string for an object', () => {
    const source = new SourceFormat({}, jest.fn());

    expect(source.convert({ foo: 'bar', n: 42 }, TEXT_CONTEXT_TYPE)).toBe('{"foo":"bar","n":42}');
    expect(source.reactConvert({ foo: 'bar', n: 42 })).toBe('{"foo":"bar","n":42}');
  });

  test('handles missing values', () => {
    const source = new SourceFormat({}, jest.fn());

    expect(source.convert(null, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
    expect(source.convert(undefined, TEXT_CONTEXT_TYPE)).toBe(NULL_LABEL);
    expectReactElementWithNull(source.reactConvert(null));
    expectReactElementWithNull(source.reactConvert(undefined));
  });

  test('returns the single element without brackets for a one-element array', () => {
    const source = new SourceFormat({}, jest.fn());

    expect(source.convert([{ foo: 'bar' }], TEXT_CONTEXT_TYPE)).toBe('["{\\"foo\\":\\"bar\\"}"]');
    expect(source.reactConvert([{ foo: 'bar' }])).toBe('{"foo":"bar"}');
  });
});
