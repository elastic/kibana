/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mappings, type MappingsDefinition } from '@kbn/es-mappings';
import type { DataStreamDefinition } from '../types';
import { applyDefaults } from './defaults';

describe('applyDefaults', () => {
  const createTestDataStream = (
    overrides: Partial<DataStreamDefinition<MappingsDefinition>> = {}
  ): DataStreamDefinition<MappingsDefinition> => ({
    name: 'test-data-stream',
    version: 1,
    template: {
      mappings: {
        properties: {
          '@timestamp': mappings.date(),
          field: mappings.keyword(),
        },
      },
    },
    ...overrides,
  });

  describe('reserved keyword validation', () => {
    it('should throw if mappings contain reserved "kibana.space_ids" key', () => {
      const dataStream = createTestDataStream({
        template: {
          mappings: {
            properties: {
              '@timestamp': mappings.date(),
              kibana: mappings.object({
                properties: {
                  space_ids: mappings.keyword(),
                  custom_field: mappings.keyword(),
                },
              }),
            },
          },
        },
      });

      expect(() => applyDefaults(dataStream)).toThrow(
        /contains reserved mapping key "kibana\.space_ids"/
      );
    });

    it('should throw if mappings contain reserved "_id" key', () => {
      const dataStream = createTestDataStream({
        template: {
          mappings: {
            properties: {
              '@timestamp': mappings.date(),
              _id: mappings.keyword(),
            },
          },
        },
      });

      expect(() => applyDefaults(dataStream)).toThrow(/contains reserved mapping key "_id"/);
    });

    it('should throw if mappings contain reserved "kibana._system" key', () => {
      const dataStream = createTestDataStream({
        template: {
          mappings: {
            properties: {
              '@timestamp': mappings.date(),
              kibana: mappings.object({
                properties: {
                  _system: mappings.object({
                    properties: {
                      custom_field: mappings.keyword(),
                    },
                  }),
                },
              }),
            },
          },
        },
      });

      expect(() => applyDefaults(dataStream)).toThrow(
        /contains reserved mapping key "kibana\._system"/
      );
    });

    it('should throw if "kibana" is not mapped as an object', () => {
      const dataStream = createTestDataStream({
        template: {
          mappings: {
            properties: {
              '@timestamp': mappings.date(),
              kibana: mappings.keyword(),
            },
          },
        },
      });

      expect(() => applyDefaults(dataStream)).toThrow(
        /contains invalid mapping for "kibana".*must be mapped as type "object"/
      );
    });

    it('should not throw if mappings do not contain reserved keys', () => {
      const dataStream = createTestDataStream();
      expect(() => applyDefaults(dataStream)).not.toThrow();
    });

    it('should not throw if mappings contain non-reserved "kibana" properties', () => {
      const dataStream = createTestDataStream({
        template: {
          mappings: {
            properties: {
              '@timestamp': mappings.date(),
              kibana: mappings.object({
                properties: {
                  custom_field_1: mappings.keyword(),
                  custom_field_2: mappings.keyword(),
                },
              }),
            },
          },
        },
      });

      expect(() => applyDefaults(dataStream)).not.toThrow();
    });
  });

  describe('system mapping injection', () => {
    it('should inject kibana.space_ids mapping', () => {
      const dataStream = createTestDataStream();
      const result = applyDefaults(dataStream);

      expect(result.template?.mappings?.properties?.kibana).toEqual({
        properties: {
          space_ids: { type: 'keyword', ignore_above: 1024 },
        },
      });
    });

    it('should preserve existing user mappings', () => {
      const dataStream = createTestDataStream();
      const result = applyDefaults(dataStream);

      expect(result.template?.mappings?.properties?.['@timestamp']).toBeDefined();
      expect(result.template?.mappings?.properties?.field).toBeDefined();
    });

    it('should preserve user-defined kibana mappings and inject kibana.space_ids', () => {
      const dataStream = createTestDataStream({
        template: {
          mappings: {
            properties: {
              '@timestamp': mappings.date(),
              kibana: mappings.object({
                properties: {
                  custom_field: mappings.keyword(),
                },
              }),
            },
          },
        },
      });
      const result = applyDefaults(dataStream);

      expect(result.template?.mappings?.properties?.kibana).toEqual({
        type: 'object',
        properties: {
          custom_field: { type: 'keyword', ignore_above: 1024 },
          space_ids: { type: 'keyword', ignore_above: 1024 },
        },
      });
    });

    it('should apply defaults', () => {
      const dataStream = createTestDataStream();
      const result = applyDefaults(dataStream);

      expect(result.hidden).toBe(true);
      expect(result.template?.priority).toBe(100);
      expect(result.template?._meta?.managed).toBe(true);
      expect(result.template?._meta?.userAgent).toBe('@kbn/data-streams');
      expect(result.template?.mappings?.dynamic).toBe(false);
      expect(result.template?.settings?.hidden).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle data stream with no template', () => {
      const dataStream: DataStreamDefinition<MappingsDefinition> = {
        name: 'test-data-stream',
        version: 1,
        template: {},
      };

      const result = applyDefaults(dataStream);
      expect(result.template?.mappings?.properties?.kibana).toEqual({
        properties: {
          space_ids: { type: 'keyword', ignore_above: 1024 },
        },
      });
    });

    it('should handle data stream with no mappings', () => {
      const dataStream: DataStreamDefinition<MappingsDefinition> = {
        name: 'test-data-stream',
        version: 1,
        template: {
          priority: 200,
        },
      };

      const result = applyDefaults(dataStream);
      expect(result.template?.mappings?.properties?.kibana).toEqual({
        properties: {
          space_ids: { type: 'keyword', ignore_above: 1024 },
        },
      });
      // Should preserve user-provided priority
      expect(result.template?.priority).toBe(200);
    });
  });
});
