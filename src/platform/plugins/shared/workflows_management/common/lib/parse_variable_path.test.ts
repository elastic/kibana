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
  parsePropertyPath,
  parseVariablePath,
  segmentsToString,
  validateVariablePath,
} from './parse_variable_path';
import type { PathSegment } from './parse_variable_path';

describe('parsePropertyPath', () => {
  it('should parse a simple identifier', () => {
    const result = parsePropertyPath('user');
    expect(result).toEqual({
      segments: [{ type: 'identifier', value: 'user' }],
      pos: 4,
    });
  });

  it('should parse a dotted path', () => {
    const result = parsePropertyPath('user.name');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'user' },
        { type: 'identifier', value: 'name' },
      ],
      pos: 9,
    });
  });

  it('should parse numeric bracket access', () => {
    const result = parsePropertyPath('items[0]');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'items' },
        { type: 'numeric_index', value: 0 },
      ],
      pos: 8,
    });
  });

  it('should parse string bracket access with double quotes', () => {
    const result = parsePropertyPath('data["user-info"]');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'data' },
        { type: 'string_literal', value: 'user-info', quote: '"' },
      ],
      pos: 17,
    });
  });

  it('should parse string bracket access with single quotes', () => {
    const result = parsePropertyPath("data['key']");
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'data' },
        { type: 'string_literal', value: 'key', quote: "'" },
      ],
      pos: 11,
    });
  });

  it('should parse dynamic bracket access', () => {
    const result = parsePropertyPath('data[fieldName]');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'data' },
        {
          type: 'dynamic_access',
          path: [{ type: 'identifier', value: 'fieldName' }],
        },
      ],
      pos: 15,
    });
  });

  it('should parse dynamic bracket access with dotted path', () => {
    const result = parsePropertyPath('obj[steps.a.output]');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'obj' },
        {
          type: 'dynamic_access',
          path: [
            { type: 'identifier', value: 'steps' },
            { type: 'identifier', value: 'a' },
            { type: 'identifier', value: 'output' },
          ],
        },
      ],
      pos: 19,
    });
  });

  it('should parse nested dynamic bracket access', () => {
    const result = parsePropertyPath('a[b[c]]');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'a' },
        {
          type: 'dynamic_access',
          path: [
            { type: 'identifier', value: 'b' },
            {
              type: 'dynamic_access',
              path: [{ type: 'identifier', value: 'c' }],
            },
          ],
        },
      ],
      pos: 7,
    });
  });

  it('should parse deeply nested dynamic bracket access', () => {
    const result = parsePropertyPath('a[b[c[d]]]');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'a' },
        {
          type: 'dynamic_access',
          path: [
            { type: 'identifier', value: 'b' },
            {
              type: 'dynamic_access',
              path: [
                { type: 'identifier', value: 'c' },
                {
                  type: 'dynamic_access',
                  path: [{ type: 'identifier', value: 'd' }],
                },
              ],
            },
          ],
        },
      ],
      pos: 10,
    });
  });

  it('should parse a complex real-world path', () => {
    const result = parsePropertyPath(
      'steps.load_comment_sync_state.output._source[steps.note_sync_space_comment.output].id'
    );
    expect(result).not.toBeNull();
    expect(result!.pos).toBe(85);
    expect(result!.segments).toHaveLength(6);
    expect(result!.segments[4]).toEqual({
      type: 'dynamic_access',
      path: [
        { type: 'identifier', value: 'steps' },
        { type: 'identifier', value: 'note_sync_space_comment' },
        { type: 'identifier', value: 'output' },
      ],
    });
  });

  it('should parse nested dynamic access in a real-world path', () => {
    const input =
      'steps.load.output._source[steps.note[steps.note_sync_space_comment]].id';
    const result = parsePropertyPath(input);
    expect(result).not.toBeNull();
    expect(result!.pos).toBe(input.length);
  });

  it('should parse mixed bracket types', () => {
    const result = parsePropertyPath('data["key"][0][fieldName]');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'data' },
        { type: 'string_literal', value: 'key', quote: '"' },
        { type: 'numeric_index', value: 0 },
        {
          type: 'dynamic_access',
          path: [{ type: 'identifier', value: 'fieldName' }],
        },
      ],
      pos: 25,
    });
  });

  it('should handle whitespace in brackets', () => {
    const result = parsePropertyPath('data[ 0 ]');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: 'data' },
        { type: 'numeric_index', value: 0 },
      ],
      pos: 9,
    });
  });

  it('should handle identifiers starting with underscore or dollar', () => {
    const result = parsePropertyPath('_source.$field');
    expect(result).toEqual({
      segments: [
        { type: 'identifier', value: '_source' },
        { type: 'identifier', value: '$field' },
      ],
      pos: 14,
    });
  });

  it('should return null for input starting with a number', () => {
    expect(parsePropertyPath('123invalid')).toBeNull();
  });

  it('should return null for input starting with a dot', () => {
    expect(parsePropertyPath('.user')).toBeNull();
  });

  it('should return null for double dots', () => {
    expect(parsePropertyPath('user..name')).toBeNull();
  });

  it('should return null for empty input', () => {
    expect(parsePropertyPath('')).toBeNull();
  });

  it('should return null for unclosed string literal', () => {
    expect(parsePropertyPath('data["key')).toBeNull();
  });

  it('should return null for unclosed bracket', () => {
    const result = parsePropertyPath('data[0');
    expect(result).toBeNull();
  });

  it('should stop before pipe character', () => {
    const result = parsePropertyPath('user.name | upcase');
    expect(result).not.toBeNull();
    expect(result!.pos).toBe(9);
  });
});

describe('segmentsToString', () => {
  it('should reconstruct a simple identifier', () => {
    const segments: PathSegment[] = [{ type: 'identifier', value: 'user' }];
    expect(segmentsToString(segments)).toBe('user');
  });

  it('should reconstruct a dotted path', () => {
    const segments: PathSegment[] = [
      { type: 'identifier', value: 'user' },
      { type: 'identifier', value: 'name' },
    ];
    expect(segmentsToString(segments)).toBe('user.name');
  });

  it('should reconstruct bracket accessors', () => {
    const segments: PathSegment[] = [
      { type: 'identifier', value: 'data' },
      { type: 'string_literal', value: 'key', quote: '"' },
      { type: 'numeric_index', value: 0 },
    ];
    expect(segmentsToString(segments)).toBe('data["key"][0]');
  });

  it('should reconstruct dynamic access', () => {
    const segments: PathSegment[] = [
      { type: 'identifier', value: 'obj' },
      {
        type: 'dynamic_access',
        path: [
          { type: 'identifier', value: 'steps' },
          { type: 'identifier', value: 'a' },
          { type: 'identifier', value: 'output' },
        ],
      },
    ];
    expect(segmentsToString(segments)).toBe('obj[steps.a.output]');
  });

  it('should reconstruct nested dynamic access', () => {
    const segments: PathSegment[] = [
      { type: 'identifier', value: 'a' },
      {
        type: 'dynamic_access',
        path: [
          { type: 'identifier', value: 'b' },
          {
            type: 'dynamic_access',
            path: [{ type: 'identifier', value: 'c' }],
          },
        ],
      },
    ];
    expect(segmentsToString(segments)).toBe('a[b[c]]');
  });

  it('should produce empty string for suffix segments starting with dot accessor', () => {
    const segments: PathSegment[] = [{ type: 'identifier', value: 'id' }];
    expect(segmentsToString(segments)).toBe('id');
  });
});

describe('isValidPropertyPath', () => {
  it('should match valid property paths', () => {
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

  it('should match paths with dynamic bracket access', () => {
    const dynamicPaths = [
      'data._source[steps.other_step.output].id',
      'obj[steps.a.output]',
      'data[fieldName]',
    ];

    dynamicPaths.forEach((path) => {
      expect(isValidPropertyPath(path)).toBe(true);
    });
  });

  it('should match paths with nested dynamic bracket access', () => {
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

  it('should not match paths with liquid filters', () => {
    const pathsWithFilters = ['user.name | upcase', 'price | round: 2', 'items | map: "title"'];

    pathsWithFilters.forEach((path) => {
      expect(isValidPropertyPath(path)).toBe(false);
    });
  });

  it('should not match invalid property paths', () => {
    const invalidPaths = [
      '123invalid',
      '.user',
      'user..name',
      '',
    ];

    invalidPaths.forEach((path) => {
      expect(isValidPropertyPath(path)).toBe(false);
    });
  });
});

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
      hasDynamicBracketAccess: false,
    });
  });

  it('should parse a path with a filter that has arguments', () => {
    const result = parseVariablePath('foo | join(",")');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['join(",")'],
      hasDynamicBracketAccess: false,
    });
  });

  it('should parse a path with multiple filters', () => {
    const result = parseVariablePath('foo | replace("foo", "bar") | capitalize');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['replace("foo", "bar")', 'capitalize'],
      hasDynamicBracketAccess: false,
    });
  });

  it('should parse a complex path with multiple filters', () => {
    const result = parseVariablePath('steps.data["key"] | join(",") | upper | trim');
    expect(result).toEqual({
      propertyPath: 'steps.data["key"]',
      filters: ['join(",")', 'upper', 'trim'],
      hasDynamicBracketAccess: false,
    });
  });

  it('should handle filters with nested parentheses', () => {
    const result = parseVariablePath('foo | replace("(test)", "bar") | title');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['replace("(test)", "bar")', 'title'],
      hasDynamicBracketAccess: false,
    });
  });

  it('should handle filters with single quotes', () => {
    const result = parseVariablePath("foo | replace('old', 'new')");
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ["replace('old', 'new')"],
      hasDynamicBracketAccess: false,
    });
  });

  it('should handle filters with named parameters', () => {
    const result = parseVariablePath('foo | replace(old="old", new="new")');
    expect(result).toEqual({
      propertyPath: 'foo',
      filters: ['replace(old="old", new="new")'],
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
        dynamicKey: 'steps.note_sync_space_comment.output',
        suffixPath: 'id',
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
        dynamicKey: 'fieldName',
        suffixPath: null,
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
        dynamicKey: 'steps.a.output',
        suffixPath: null,
      },
    });
  });

  it('should parse nested dynamic bracket access', () => {
    const result = parseVariablePath(
      'steps.load.output._source[steps.note[steps.note_sync_space_comment]].id'
    );
    expect(result).toEqual({
      propertyPath:
        'steps.load.output._source[steps.note[steps.note_sync_space_comment]].id',
      filters: [],
      hasDynamicBracketAccess: true,
      dynamicAccess: {
        prefixPath: 'steps.load.output._source',
        dynamicKey: 'steps.note[steps.note_sync_space_comment]',
        suffixPath: 'id',
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
        dynamicKey: 'b[c[d]]',
        suffixPath: null,
      },
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
