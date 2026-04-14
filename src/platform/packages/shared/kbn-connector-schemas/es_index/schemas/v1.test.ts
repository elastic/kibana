/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConfigSchema, SecretsSchema, ParamsSchema } from './v1';
import { ALERT_HISTORY_PREFIX } from '../constants';

describe('ES Index Schema', () => {
  describe('ConfigSchema', () => {
    it('validates a valid config', () => {
      expect(() =>
        ConfigSchema.parse({
          index: 'my-index',
        })
      ).not.toThrow();
    });

    it('applies default values', () => {
      const result = ConfigSchema.parse({
        index: 'my-index',
      });
      expect(result.refresh).toBe(false);
      expect(result.executionTimeField).toBeNull();
    });

    it('validates with all fields', () => {
      expect(() =>
        ConfigSchema.parse({
          index: 'my-index',
          refresh: true,
          executionTimeField: '@timestamp',
        })
      ).not.toThrow();
    });

    it('throws when index is missing', () => {
      expect(() => ConfigSchema.parse({})).toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ConfigSchema.parse({
          index: 'my-index',
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('SecretsSchema', () => {
    it('validates empty object', () => {
      expect(() => SecretsSchema.parse({})).not.toThrow();
    });

    it('applies default empty object', () => {
      const result = SecretsSchema.parse({});
      expect(result).toEqual({});
    });

    it('throws on unknown properties', () => {
      expect(() =>
        SecretsSchema.parse({
          unknownProp: 'value',
        })
      ).toThrow();
    });
  });

  describe('ParamsSchema', () => {
    it('validates with required documents', () => {
      expect(() =>
        ParamsSchema.parse({
          documents: [{ field: 'value' }],
        })
      ).not.toThrow();
    });

    it('applies default null for indexOverride', () => {
      const result = ParamsSchema.parse({
        documents: [{ field: 'value' }],
      });
      expect(result.indexOverride).toBeNull();
    });

    it('validates with valid indexOverride starting with alert history prefix', () => {
      expect(() =>
        ParamsSchema.parse({
          documents: [{ field: 'value' }],
          indexOverride: `${ALERT_HISTORY_PREFIX}my-index`,
        })
      ).not.toThrow();
    });

    it('throws on indexOverride not starting with alert history prefix', () => {
      expect(() =>
        ParamsSchema.parse({
          documents: [{ field: 'value' }],
          indexOverride: 'my-index',
        })
      ).toThrow();
    });

    it('allows null indexOverride', () => {
      expect(() =>
        ParamsSchema.parse({
          documents: [{ field: 'value' }],
          indexOverride: null,
        })
      ).not.toThrow();
    });

    it('throws when documents is missing', () => {
      expect(() => ParamsSchema.parse({})).toThrow();
    });

    it('validates with multiple documents', () => {
      expect(() =>
        ParamsSchema.parse({
          documents: [{ field1: 'value1' }, { field2: 'value2' }, { field3: 'value3' }],
        })
      ).not.toThrow();
    });

    it('validates documents with nested objects', () => {
      expect(() =>
        ParamsSchema.parse({
          documents: [
            {
              field: 'value',
              nested: {
                subfield: 'subvalue',
              },
            },
          ],
        })
      ).not.toThrow();
    });

    it('throws on unknown properties', () => {
      expect(() =>
        ParamsSchema.parse({
          documents: [{ field: 'value' }],
          unknownProp: 'value',
        })
      ).toThrow();
    });

    it('validates empty documents array', () => {
      expect(() =>
        ParamsSchema.parse({
          documents: [],
        })
      ).not.toThrow();
    });
  });
});
