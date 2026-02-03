/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { getDrilldownRegistry } from './registry';

describe('drilldown registry', () => {
  describe('getSchemas', () => {
    const registry = getDrilldownRegistry();
    registry.registerDrilldown('foo_drilldown', {
      schema: schema.object({
        foo: schema.string(),
      }),
      supportedTriggers: ['ON_CLICK', 'ON_HOVER', 'ON_ROW_CLICK'],
    });
    registry.registerDrilldown('bar_drilldown', {
      schema: schema.object({
        bar: schema.string(),
      }),
      supportedTriggers: ['ON_CLICK'],
    });

    function getType(drilldownJoiSchema: any) {
      return drilldownJoiSchema.schema.keys.type.allow[0];
    }

    function getTriggerLiterals(drilldownJoiSchema: any) {
      return drilldownJoiSchema.schema.keys.trigger.matches.map(
        (match: any) => match.schema.allow[0]
      );
    }

    test('should include drilldowns that intersect with supported triggers', () => {
      const onClickDrilldownsSchema = registry.getSchema(['ON_CLICK']);
      const drilldownsJoiSchema = onClickDrilldownsSchema.getPropSchemas().drilldowns?.getSchema();
      const matches = drilldownsJoiSchema.describe().items[0].matches;
      expect(matches.length).toBe(2);
      expect(getType(matches[0])).toBe('foo_drilldown');
      expect(getType(matches[1])).toBe('bar_drilldown');
    });

    test('should remove drilldowns that do not intersect with supported triggers', () => {
      const onHoverDrilldownsSchema = registry.getSchema(['ON_HOVER']);
      const drilldownsJoiSchema = onHoverDrilldownsSchema.getPropSchemas().drilldowns?.getSchema();
      const matches = drilldownsJoiSchema.describe().items[0].matches;
      expect(matches.length).toBe(1);
      expect(getType(matches[0])).toBe('foo_drilldown');
    });

    test('should include triggers that intersect with supported triggers', () => {
      const drilldownsSchema = registry.getSchema(['ON_CLICK', 'ON_ROW_CLICK']);
      const drilldownsJoiSchema = drilldownsSchema.getPropSchemas().drilldowns?.getSchema();
      const matches = drilldownsJoiSchema.describe().items[0].matches;
      // foo drilldown schema should not show 'ON_HOVER' because that trigger does not intersect supported triggers
      expect(getTriggerLiterals(matches[0])).toEqual(['ON_CLICK', 'ON_ROW_CLICK']);
      expect(getTriggerLiterals(matches[1])).toEqual(['ON_CLICK']);
    });
  });
});
