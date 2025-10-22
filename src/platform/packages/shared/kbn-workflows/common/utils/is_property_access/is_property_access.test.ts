/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPropertyAccess } from './is_property_access';

describe('isPropertyAccess', () => {
  describe('valid property access patterns', () => {
    it('should return true for simple identifiers', () => {
      expect(isPropertyAccess('user')).toBe(true);
      expect(isPropertyAccess('data')).toBe(true);
      expect(isPropertyAccess('_private')).toBe(true);
      expect(isPropertyAccess('$scope')).toBe(true);
      expect(isPropertyAccess('myVar123')).toBe(true);
    });

    it('should return true for dot notation property access', () => {
      expect(isPropertyAccess('user.name')).toBe(true);
      expect(isPropertyAccess('user.data.foo')).toBe(true);
      expect(isPropertyAccess('obj.prop1.prop2.prop3')).toBe(true);
      expect(isPropertyAccess('_private.value')).toBe(true);
      expect(isPropertyAccess('$scope.model')).toBe(true);
    });

    it('should return true for bracket notation with single quotes', () => {
      expect(isPropertyAccess("user['name']")).toBe(true);
      expect(isPropertyAccess("user['data']['foo']")).toBe(true);
      expect(isPropertyAccess("user['with space']")).toBe(true);
      expect(isPropertyAccess("user['with space']['foo space']")).toBe(true);
      expect(isPropertyAccess("obj['prop-with-dash']")).toBe(true);
      expect(isPropertyAccess("obj['123']")).toBe(true);
    });

    it('should return true for bracket notation with double quotes', () => {
      expect(isPropertyAccess('user["name"]')).toBe(true);
      expect(isPropertyAccess('user["data"]["foo"]')).toBe(true);
      expect(isPropertyAccess('user["with space"]')).toBe(true);
      expect(isPropertyAccess('user["with space"]["foo space"]')).toBe(true);
      expect(isPropertyAccess('obj["prop-with-dash"]')).toBe(true);
      expect(isPropertyAccess('obj["123"]')).toBe(true);
    });

    it('should return true for mixed notation', () => {
      expect(isPropertyAccess("user['data'].foo")).toBe(true);
      expect(isPropertyAccess('user.data["foo"]')).toBe(true);
      expect(isPropertyAccess("user['data'].foo.bar['baz']")).toBe(true);
      expect(isPropertyAccess('obj.prop["nested"].value')).toBe(true);
    });

    it('should handle strings with leading/trailing whitespace', () => {
      expect(isPropertyAccess(' user ')).toBe(true);
      expect(isPropertyAccess(' user.name ')).toBe(true);
      expect(isPropertyAccess("  user['data']  ")).toBe(true);
    });

    it('should return true for empty string properties', () => {
      expect(isPropertyAccess("user['']")).toBe(true);
      expect(isPropertyAccess('user[""]')).toBe(true);
    });

    it('should return true for array indices', () => {
      expect(isPropertyAccess('steps.analysis.output.0.result')).toBe(true);
      expect(isPropertyAccess(`steps.analysis.output['0']`)).toBe(true);
      expect(isPropertyAccess(`steps.analysis.output[0]`)).toBe(true);
      expect(isPropertyAccess(`steps.analysis.output['0'].result`)).toBe(true);
      expect(isPropertyAccess(`steps.analysis.output["10"].result`)).toBe(true);
    });
  });

  describe('invalid property access patterns', () => {
    it('should return false for empty or whitespace-only strings', () => {
      expect(isPropertyAccess('')).toBe(false);
      expect(isPropertyAccess('   ')).toBe(false);
    });

    it('should return false for strings starting with numbers', () => {
      expect(isPropertyAccess('123user')).toBe(false);
      expect(isPropertyAccess('1user.name')).toBe(false);
    });

    it('should return false for strings starting with dots', () => {
      expect(isPropertyAccess('.user')).toBe(false);
      expect(isPropertyAccess('.name')).toBe(false);
    });

    it('should return false for consecutive dots', () => {
      expect(isPropertyAccess('user..name')).toBe(false);
      expect(isPropertyAccess('user.data..foo')).toBe(false);
    });

    it('should return false for trailing dots', () => {
      expect(isPropertyAccess('user.')).toBe(false);
      expect(isPropertyAccess('user.name.')).toBe(false);
    });

    it('should return false for empty bracket notation', () => {
      expect(isPropertyAccess('user[]')).toBe(false);
    });

    it('should return false for bracket notation with non-numeric identifiers without quotes', () => {
      expect(isPropertyAccess('user[name]')).toBe(false);
      expect(isPropertyAccess('user[variableName]')).toBe(false);
    });

    it('should return false for mismatched quotes', () => {
      expect(isPropertyAccess('user["name\']')).toBe(false);
      expect(isPropertyAccess('user[\'name"]')).toBe(false);
    });

    it('should return false for unclosed brackets', () => {
      expect(isPropertyAccess("user['name'")).toBe(false);
      expect(isPropertyAccess('user["name"')).toBe(false);
      expect(isPropertyAccess("user['name']user['")).toBe(false);
    });

    it('should return false for invalid characters', () => {
      expect(isPropertyAccess('user-name')).toBe(false);
      expect(isPropertyAccess('user name')).toBe(false);
      expect(isPropertyAccess('user@name')).toBe(false);
      expect(isPropertyAccess('user#name')).toBe(false);
    });

    it('should return false for function calls', () => {
      expect(isPropertyAccess('user()')).toBe(false);
      expect(isPropertyAccess('user.getName()')).toBe(false);
    });

    it('should return false for non-string inputs', () => {
      expect(isPropertyAccess(null as any)).toBe(false);
      expect(isPropertyAccess(undefined as any)).toBe(false);
      expect(isPropertyAccess(123 as any)).toBe(false);
      expect(isPropertyAccess({} as any)).toBe(false);
    });

    it('should return false for strings with special characters in dot notation', () => {
      expect(isPropertyAccess('user.name-value')).toBe(false);
      expect(isPropertyAccess('user.name value')).toBe(false);
      expect(isPropertyAccess('user.123name')).toBe(false);
    });
  });
});
