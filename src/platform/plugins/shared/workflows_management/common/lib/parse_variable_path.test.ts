/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isValidPropertyPath,
  parseVariablePath,
  validateVariablePath,
} from './parse_variable_path';

describe('isValidPropertyPath', () => {
  it('should accept valid property paths', () => {
    const validPaths = [
      'user',
      'user.name',
      'steps.step1.output',
      'items[0]',
      'users["john"]',
      "data['key']",
      'user.contacts[0].email',
      'response.data["user-info"].name',
    ];

    validPaths.forEach((path) => {
      expect(isValidPropertyPath(path)).toBe(true);
    });
  });

  it('should accept paths with dynamic bracket access', () => {
    const dynamicPaths = [
      'data._source[steps.other_step.output].id',
      'obj[steps.a.output]',
      'data[fieldName]',
    ];

    dynamicPaths.forEach((path) => {
      expect(isValidPropertyPath(path)).toBe(true);
    });
  });

  it('should accept paths with nested dynamic bracket access', () => {
    const nestedPaths = [
      'a[b[c]]',
      'a[b[c[d]]]',
      'data[steps.note[steps.other]]',
      'steps.load.output._source[steps.note[steps.note_sync_space_comment]].id',
    ];

    nestedPaths.forEach((path) => {
      expect(isValidPropertyPath(path)).toBe(true);
    });
  });

  it('should reject paths with liquid filters', () => {
    const pathsWithFilters = ['user.name | upcase', 'price | round: 2', 'items | map: "title"'];

    pathsWithFilters.forEach((path) => {
      expect(isValidPropertyPath(path)).toBe(false);
    });
  });

  it('should accept identifiers starting with numbers', () => {
    expect(isValidPropertyPath('123field')).toBe(true);
    expect(isValidPropertyPath('3rdPartyId')).toBe(true);
  });

  it('should reject invalid property paths', () => {
    const invalidPaths = ['user..name', ''];

    invalidPaths.forEach((path) => {
      expect(isValidPropertyPath(path)).toBe(false);
    });
  });
});

describe('validateVariablePath', () => {
  it('should validate a simple path', () => {
    expect(validateVariablePath('foo')).toBe(true);
  });

  it('should accept identifiers starting with a number', () => {
    expect(validateVariablePath('1foo')).toBe(true);
    expect(validateVariablePath('steps.3rdPartyId')).toBe(true);
  });

  it('should fail if any segment contains a special character', () => {
    expect(validateVariablePath('foo@bar')).toBe(false);
  });

  it('should validate a path with a dot', () => {
    expect(validateVariablePath('steps.snake_case')).toBe(true);
  });

  it('should accept kebab-case identifiers accessed with dot', () => {
    expect(validateVariablePath('steps.first-step')).toBe(true);
  });

  it('should validate a path with brackets', () => {
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
    expect(validateVariablePath('foo | replace: "foo", "bar" | capitalize')).toBe(true);
  });

  it('should validate a complex path with filters', () => {
    expect(validateVariablePath('steps.data["key"] | join: "," | upper')).toBe(true);
  });

  it('should validate paths with dynamic bracket access', () => {
    expect(
      validateVariablePath(
        'steps.load_comment_sync_state.output._source[steps.note_sync_space_comment.output].id'
      )
    ).toBe(true);
    expect(validateVariablePath('data[fieldName]')).toBe(true);
    expect(validateVariablePath('obj[steps.a.output] | json')).toBe(true);
  });

  it('should validate paths with nested dynamic bracket access', () => {
    expect(
      validateVariablePath(
        'steps.load.output._source[steps.note[steps.note_sync_space_comment]].id'
      )
    ).toBe(true);
    expect(validateVariablePath('a[b[c]] | json')).toBe(true);
  });
});

describe('parseVariablePath', () => {
  it('should parse a simple path without filters', () => {
    const result = parseVariablePath('foo');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: [],
      hasDynamicBracketAccess: false,
    });
  });

  it('should parse a complex path without filters', () => {
    const result = parseVariablePath('steps.data["key"][0]');
    expect(result).toEqual({
      propertyPath: 'steps.data["key"][0]',
      filters: [],
      hasDynamicBracketAccess: false,
    });
  });

  it('should accept kebab-case paths', () => {
    const result = parseVariablePath('steps.data.kebab-case[0] | capitalize');
    expect(result).toMatchObject({
      propertyPath: 'steps.data.kebab-case[0]',
      filters: ['capitalize'],
    });
  });

  it('should parse a path with a single filter', () => {
    const result = parseVariablePath('foo | title');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['title'],
      hasDynamicBracketAccess: false,
    });
  });

  it('should parse a path with a filter that has arguments', () => {
    const result = parseVariablePath('foo | join: ","');
    expect(result).toMatchObject({
      propertyPath: 'foo',
      filters: [expect.stringContaining('join')],
      hasDynamicBracketAccess: false,
    });
  });

  it('should parse a path with multiple filters', () => {
    const result = parseVariablePath('foo | replace: "foo", "bar" | capitalize');
    expect(result).toMatchObject({
      propertyPath: 'foo',
      filters: [expect.stringContaining('replace'), 'capitalize'],
      hasDynamicBracketAccess: false,
    });
  });

  it('should parse a complex path with multiple filters', () => {
    const result = parseVariablePath('steps.data["key"] | join: "," | upper | trim');
    expect(result).toMatchObject({
      propertyPath: 'steps.data["key"]',
      filters: [expect.stringContaining('join'), 'upper', 'trim'],
      hasDynamicBracketAccess: false,
    });
  });

  it('should handle spaces around pipes and filter names', () => {
    const result = parseVariablePath('  foo  |  title  |  upper  ');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['title', 'upper'],
      hasDynamicBracketAccess: false,
    });
  });

  it('should parse paths with dynamic bracket access', () => {
    const result = parseVariablePath(
      'steps.load_comment_sync_state.output._source[steps.note_sync_space_comment.output].id'
    );
    expect(result).toEqual({
      propertyPath:
        'steps.load_comment_sync_state.output._source[steps.note_sync_space_comment.output].id',
      filters: [],
      hasDynamicBracketAccess: true,
      dynamicAccess: {
        prefixPath: 'steps.load_comment_sync_state.output._source',
        dynamicKeys: ['steps.note_sync_space_comment.output'],
      },
    });
  });

  it('should parse simple dynamic bracket access', () => {
    const result = parseVariablePath('data[fieldName]');
    expect(result).toEqual({
      propertyPath: 'data[fieldName]',
      filters: [],
      hasDynamicBracketAccess: true,
      dynamicAccess: {
        prefixPath: 'data',
        dynamicKeys: ['fieldName'],
      },
    });
  });

  it('should parse dynamic bracket access with filters', () => {
    const result = parseVariablePath('obj[steps.a.output] | json');
    expect(result).toEqual({
      propertyPath: 'obj[steps.a.output]',
      filters: ['json'],
      hasDynamicBracketAccess: true,
      dynamicAccess: {
        prefixPath: 'obj',
        dynamicKeys: ['steps.a.output'],
      },
    });
  });

  it('should parse nested dynamic bracket access', () => {
    const result = parseVariablePath(
      'steps.load.output._source[steps.note[steps.note_sync_space_comment]].id'
    );
    expect(result).toEqual({
      propertyPath: 'steps.load.output._source[steps.note[steps.note_sync_space_comment]].id',
      filters: [],
      hasDynamicBracketAccess: true,
      dynamicAccess: {
        prefixPath: 'steps.load.output._source',
        dynamicKeys: ['steps.note_sync_space_comment'],
      },
    });
  });

  it('should parse deeply nested dynamic bracket access', () => {
    const result = parseVariablePath('a[b[c[d]]]');
    expect(result).toEqual({
      propertyPath: 'a[b[c[d]]]',
      filters: [],
      hasDynamicBracketAccess: true,
      dynamicAccess: {
        prefixPath: 'a',
        dynamicKeys: ['d'],
      },
    });
  });

  it('should collect all dynamic keys from multiple bracket accesses', () => {
    const result = parseVariablePath('a[b].x[c[d]].y');
    expect(result).toEqual({
      propertyPath: 'a[b].x[c[d]].y',
      filters: [],
      hasDynamicBracketAccess: true,
      dynamicAccess: {
        prefixPath: 'a',
        dynamicKeys: ['b', 'd'],
      },
    });
  });

  it('should accept paths starting with a number', () => {
    const result = parseVariablePath('1foo | title');
    expect(result).toMatchObject({
      propertyPath: '1foo',
      filters: ['title'],
    });
  });

  it('should return errors for invalid variable paths', () => {
    const result = parseVariablePath('foo@bar | title');
    expect(result).toMatchObject({
      errors: expect.arrayContaining([expect.stringContaining('Invalid')]),
      propertyPath: null,
      filters: [],
    });
  });

  it('should return errors for invalid filters', () => {
    const result = parseVariablePath('foo | title | $invalid');
    expect(result).toMatchObject({
      errors: expect.arrayContaining([expect.stringContaining('Invalid')]),
      propertyPath: null,
      filters: [],
    });
  });

  it('should return null for empty input', () => {
    expect(parseVariablePath('')).toBeNull();
  });
});
