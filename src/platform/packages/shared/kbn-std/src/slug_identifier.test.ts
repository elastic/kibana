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

    it('replaces underscores with hyphens', () => {
      expect(toSlugIdentifier('my_connector_name')).toEqual('my-connector-name');
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

    it('trims leading hyphens', () => {
      expect(toSlugIdentifier(' slack')).toEqual('slack');
      expect(toSlugIdentifier('!!!test')).toEqual('test');
    });

    it('trims trailing hyphens', () => {
      expect(toSlugIdentifier('slack-')).toEqual('slack');
      expect(toSlugIdentifier('test!!!')).toEqual('test');
    });

    it('handles mixed cases and special characters', () => {
      expect(toSlugIdentifier('My Email Connector-Production ')).toEqual(
        'my-email-connector-production'
      );
    });

    it('strips diacritics from accented characters', () => {
      expect(toSlugIdentifier('  Tést  ')).toEqual('test');
    });

    it('returns empty string for non-latin characters', () => {
      expect(toSlugIdentifier('日本語')).toEqual('');
    });

    it('replaces apostrophes with hyphens', () => {
      expect(toSlugIdentifier("Connector's id")).toEqual('connector-s-id');
    });

    it('replaces repeated symbols with a single hyphen', () => {
      expect(toSlugIdentifier('foo++ bar!')).toEqual('foo-bar');
    });

    it('handles leading and trailing underscores with mixed spacing', () => {
      expect(toSlugIdentifier('__foo  bar--baz__')).toEqual('foo-bar-baz');
    });

    it('handles symbols mixed with numbers', () => {
      expect(toSlugIdentifier('Foo bar #42 (draft)')).toEqual('foo-bar-42-draft');
    });

    it('collapses multiple consecutive spaces', () => {
      expect(toSlugIdentifier('foo   bar')).toEqual('foo-bar');
    });

    it('throws for input exceeding 1000 characters', () => {
      expect(() => toSlugIdentifier('a'.repeat(1001))).toThrow('Input too long');
    });

    it('accepts input of exactly 1000 characters', () => {
      expect(() => toSlugIdentifier('a'.repeat(1000))).not.toThrow();
    });
  });

  describe('isValidSlugIdentifier', () => {
    it('returns true for valid identifiers', () => {
      expect(isValidSlugIdentifier('my-connector')).toBe(true);
      expect(isValidSlugIdentifier('connector123')).toBe(true);
      expect(isValidSlugIdentifier('my-connector-123')).toBe(true);
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

    it('returns false for identifiers with underscores', () => {
      expect(isValidSlugIdentifier('my_connector')).toBe(false);
    });

    it('returns false for identifiers with consecutive hyphens', () => {
      expect(isValidSlugIdentifier('my--connector')).toBe(false);
    });
  });
});
