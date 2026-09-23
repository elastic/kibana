/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseVariablePath, validateVariablePath } from './parse_variable_path';

describe('validateVariablePath', () => {
  it('should validate a simple path', () => {
    expect(validateVariablePath('foo')).toBe(true);
  });

  it('should fail if any segment starts with a number', () => {
    expect(validateVariablePath('1foo')).toBe(false);
  });

  it('should fail if any segment contains a space', () => {
    expect(validateVariablePath('foo bar')).toBe(false);
  });

  it('should fail if any segment contains a special character', () => {
    expect(validateVariablePath('foo@bar')).toBe(false);
  });

  it('should validate a path with a dot', () => {
    expect(validateVariablePath('steps.snake_case')).toBe(true);
  });

  it('should fail on kebab-case if accessed with dot', () => {
    expect(validateVariablePath('steps.first-step')).toBe(false);
  });

  it('should validate a path with a brackets', () => {
    expect(validateVariablePath('foo["4-bar-a"]')).toBe(true);
    expect(validateVariablePath("foo['4-bar-a']")).toBe(true);
  });

  it('should fail if quotes are not closed or mixed', () => {
    expect(validateVariablePath(`steps["first-step']`)).toBe(false);
    expect(validateVariablePath('steps["first-step]')).toBe(false);
    expect(validateVariablePath(`steps['first-step]`)).toBe(false);
  });

  it('should validate a path with a dot and a bracket', () => {
    expect(validateVariablePath('foo.bar["baz"]')).toBe(true);
  });

  it('should validate a numeric index', () => {
    expect(validateVariablePath('steps[0]')).toBe(true);
  });

  it('should validate a path with filters', () => {
    expect(validateVariablePath('foo | title')).toBe(true);
  });

  it('should validate a path with multiple filters', () => {
    expect(validateVariablePath('foo | replace("foo", "bar") | capitalize')).toBe(true);
  });

  it('should validate a complex path with filters', () => {
    expect(validateVariablePath('steps.data["key"] | join(",") | upper')).toBe(true);
  });
});

describe('parseVariablePath', () => {
  it('should parse a simple path without filters', () => {
    const result = parseVariablePath('foo');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: [],
    });
  });

  it('should parse a complex path without filters', () => {
    const result = parseVariablePath('steps.data["key"][0]');
    expect(result).toEqual({
      propertyPath: 'steps.data["key"][0]',
      filters: [],
    });
  });

  it('should return errors for invalid paths', () => {
    const result = parseVariablePath('steps.data.kebab-case[0] | capitalize');
    expect(result).toEqual({
      errors: ['Invalid property path: steps.data.kebab-case[0]'],
      propertyPath: null,
      filters: [],
    });
  });

  it('should parse a path with a single filter', () => {
    const result = parseVariablePath('foo | title');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['title'],
    });
  });

  it('should parse a path with a filter that has arguments', () => {
    const result = parseVariablePath('foo | join(",")');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['join(",")'],
    });
  });

  it('should parse a path with multiple filters', () => {
    const result = parseVariablePath('foo | replace("foo", "bar") | capitalize');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['replace("foo", "bar")', 'capitalize'],
    });
  });

  it('should parse a complex path with multiple filters', () => {
    const result = parseVariablePath('steps.data["key"] | join(",") | upper | trim');
    expect(result).toEqual({
      propertyPath: 'steps.data["key"]',
      filters: ['join(",")', 'upper', 'trim'],
    });
  });

  it('should handle filters with nested parentheses', () => {
    const result = parseVariablePath('foo | replace("(test)", "bar") | title');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['replace("(test)", "bar")', 'title'],
    });
  });

  it('should handle filters with single quotes', () => {
    const result = parseVariablePath("foo | replace('old', 'new')");
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ["replace('old', 'new')"],
    });
  });

  it('should handle filters with named parameters', () => {
    const result = parseVariablePath('foo | replace(old="old", new="new")');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['replace(old="old", new="new")'],
    });
  });

  it('should handle spaces around pipes and filter names', () => {
    const result = parseVariablePath('  foo  |  title  |  upper  ');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['title', 'upper'],
    });
  });

  it('should return null for invalid variable paths', () => {
    expect(parseVariablePath('1foo | title')).toEqual({
      errors: ['Invalid property path: 1foo'],
      propertyPath: null,
      filters: [],
    });
    expect(parseVariablePath('foo@bar | title')).toEqual({
      errors: ['Invalid property path: foo@bar'],
      propertyPath: null,
      filters: [],
    });
  });

  it('should return null for invalid filters', () => {
    expect(parseVariablePath('foo | 1invalid')).toEqual({
      errors: ['Invalid filter name: 1invalid'],
      propertyPath: null,
      filters: [],
    });

    expect(parseVariablePath('foo | title | $invalid')).toEqual({
      errors: ['Invalid filter name: $invalid'],
      propertyPath: null,
      filters: [],
    });
  });
});
