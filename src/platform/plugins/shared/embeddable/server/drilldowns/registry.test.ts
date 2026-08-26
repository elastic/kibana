/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { getDrilldownRegistry } from './registry';

describe('drilldown registry', () => {
  describe('getSchemas', () => {
    const registry = getDrilldownRegistry();
    registry.registerDrilldown('foo_drilldown', {
      schema: z.object({
        foo: z.string(),
      }),
      supportedTriggers: ['ON_CLICK', 'ON_HOVER', 'ON_ROW_CLICK'],
    });
    registry.registerDrilldown('bar_drilldown', {
      schema: z.object({
        bar: z.string(),
      }),
      supportedTriggers: ['ON_CLICK'],
    });

    function resolveAnyOf(items: z.core.JSONSchema.JSONSchema['items']) {
      return !Array.isArray(items) && typeof items === 'object' ? items.anyOf ?? [] : [];
    }

    function getMatches({ items }: z.core.JSONSchema.JSONSchema) {
      return resolveAnyOf(items);
    }

    function getTriggerLiterals(match: z.core.JSONSchema.JSONSchema) {
      const triggers = resolveAnyOf(match.allOf?.[1]?.properties?.trigger);
      return triggers.map((trigger) => trigger.const);
    }

    test('should throw when there is no intersection with supported triggers', () => {
      expect(() => {
        registry.getSchema([]);
      }).toThrow();
    });

    test('should include drilldowns that intersect with supported triggers', () => {
      const drilldownsSchema = registry.getSchema(['ON_CLICK']);
      const schemaJson = z.toJSONSchema(drilldownsSchema.shape.drilldowns);
      const matches = getMatches(schemaJson);
      expect(matches.length).toBe(2);
      expect(matches[0]?.title).toBe('bar_drilldown');
      expect(matches[1]?.title).toBe('foo_drilldown');
    });

    test('should remove drilldowns that do not intersect with supported triggers', () => {
      const drilldownsSchema = registry.getSchema(['ON_HOVER']);
      const schemaJson = z.toJSONSchema(drilldownsSchema.shape.drilldowns);
      const matches = getMatches(schemaJson);
      expect(matches.length).toBe(1);
      expect(matches[0]?.title).toBe('foo_drilldown');
    });

    test('should include triggers that intersect with supported triggers', () => {
      const drilldownsSchema = registry.getSchema(['ON_CLICK', 'ON_ROW_CLICK']);
      const schemaJson = z.toJSONSchema(drilldownsSchema.shape.drilldowns);
      const matches = getMatches(schemaJson);
      expect(getTriggerLiterals(matches[0])).toEqual(['ON_CLICK']);
      // foo drilldown schema should not show 'ON_HOVER' because that trigger does not intersect supported triggers
      expect(getTriggerLiterals(matches[1])).toEqual(['ON_CLICK', 'ON_ROW_CLICK']);
    });
  });
});
