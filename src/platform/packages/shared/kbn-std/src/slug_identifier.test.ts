/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toSlugIdentifier, isValidSlugIdentifier } from './slug_identifier';

describe('slug_identifier', () => {
  describe('toSlugIdentifier', () => {
    it('converts uppercase to lowercase', () => {
      expect(toSlugIdentifier('My Connector')).toEqual('my-connector');
    });

    it('replaces spaces with hyphens', () => {
      expect(toSlugIdentifier('this is a test')).toEqual('this-is-a-test');
    });

    it('replaces special characters with hyphens', () => {
      expect(toSlugIdentifier('test@connector#1')).toEqual('test-connector-1');
    });

    it('preserves underscores', () => {
      expect(toSlugIdentifier('my_connector_name')).toEqual('my_connector_name');
    });

    it('preserves numbers', () => {
      expect(toSlugIdentifier('connector123')).toEqual('connector123');
    });

    it('handles empty string', () => {
      expect(toSlugIdentifier('')).toEqual('');
    });

    it('handles undefined', () => {
      expect(toSlugIdentifier()).toEqual('');
    });

    it('trims trailing hyphens', () => {
      expect(toSlugIdentifier('slack ')).toEqual('slack');
      expect(toSlugIdentifier('test!!!')).toEqual('test');
    });

    it('trims leading hyphens', () => {
      expect(toSlugIdentifier(' slack')).toEqual('slack');
      expect(toSlugIdentifier('!!!test')).toEqual('test');
    });

    it('trims both leading and trailing hyphens', () => {
      expect(toSlugIdentifier(' slack ')).toEqual('slack');
      expect(toSlugIdentifier('  my connector  ')).toEqual('my-connector');
    });

    it('handles mixed cases and special characters', () => {
      expect(toSlugIdentifier('My Email Connector (Production)')).toEqual(
        'my-email-connector--production'
      );
    });
  });

  describe('isValidSlugIdentifier', () => {
    it('returns true for valid identifiers', () => {
      expect(isValidSlugIdentifier('my-connector')).toBe(true);
      expect(isValidSlugIdentifier('my_connector')).toBe(true);
      expect(isValidSlugIdentifier('connector123')).toBe(true);
      expect(isValidSlugIdentifier('my-connector_123')).toBe(true);
    });

    it('returns false for identifiers with uppercase', () => {
      expect(isValidSlugIdentifier('My-Connector')).toBe(false);
    });

    it('returns false for identifiers with spaces', () => {
      expect(isValidSlugIdentifier('my connector')).toBe(false);
    });

    it('returns false for identifiers with special characters', () => {
      expect(isValidSlugIdentifier('my@connector')).toBe(false);
    });

    it('returns true for empty string', () => {
      expect(isValidSlugIdentifier('')).toBe(true);
    });

    it('returns false for identifiers with leading hyphens', () => {
      expect(isValidSlugIdentifier('-my-connector')).toBe(false);
    });

    it('returns false for identifiers with trailing hyphens', () => {
      expect(isValidSlugIdentifier('my-connector-')).toBe(false);
    });
  });
});
