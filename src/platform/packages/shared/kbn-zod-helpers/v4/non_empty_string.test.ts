/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NonEmptyString, NonEmptyOrWhitespaceString } from './non_empty_string';

describe('NonEmptyString', () => {
  it('accepts a non-empty string', () => {
    expect(NonEmptyString.parse('hello')).toBe('hello');
  });

  it('rejects an empty string', () => {
    expect(() => NonEmptyString.parse('')).toThrow();
  });

  it('rejects a whitespace-only string', () => {
    expect(() => NonEmptyString.parse('   ')).toThrow();
  });

  it('rejects non-string values', () => {
    expect(() => NonEmptyString.parse(123)).toThrow();
    expect(() => NonEmptyString.parse(null)).toThrow();
  });

  it('has the expected description', () => {
    expect(NonEmptyString.description).toBe('A non-empty string.');
  });
});

describe('NonEmptyOrWhitespaceString', () => {
  it('accepts a non-empty string', () => {
    expect(NonEmptyOrWhitespaceString.parse('hello')).toBe('hello');
  });

  it('accepts a whitespace-only string', () => {
    expect(NonEmptyOrWhitespaceString.parse('   ')).toBe('   ');
  });

  it('rejects an empty string', () => {
    expect(() => NonEmptyOrWhitespaceString.parse('')).toThrow();
  });

  it('rejects non-string values', () => {
    expect(() => NonEmptyOrWhitespaceString.parse(123)).toThrow();
  });

  it('has the expected description', () => {
    expect(NonEmptyOrWhitespaceString.description).toBe(
      'A non-empty string or string with whitespace.'
    );
  });
});
