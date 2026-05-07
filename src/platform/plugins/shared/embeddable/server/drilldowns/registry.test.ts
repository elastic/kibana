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

    test('should throw when there is no intersection with supported triggers', () => {
      expect(() => {
        registry.getSchema([]);
      }).toThrow();
    });

    test('should include drilldowns that intersect with supported triggers', () => {
      const onClickDrilldownsSchema = registry.getSchema(['ON_CLICK']);
      expect(() =>
        onClickDrilldownsSchema.validate({
          drilldowns: [
            { type: 'bar_drilldown', label: 'b', trigger: 'ON_CLICK', bar: 'x' },
            { type: 'foo_drilldown', label: 'f', trigger: 'ON_CLICK', foo: 'y' },
          ],
        })
      ).not.toThrow();
    });

    test('should remove drilldowns that do not intersect with supported triggers', () => {
      const onHoverDrilldownsSchema = registry.getSchema(['ON_HOVER']);
      expect(() =>
        onHoverDrilldownsSchema.validate({
          drilldowns: [{ type: 'foo_drilldown', label: 'f', trigger: 'ON_HOVER', foo: 'y' }],
        })
      ).not.toThrow();
      expect(() =>
        onHoverDrilldownsSchema.validate({
          drilldowns: [{ type: 'bar_drilldown', label: 'b', trigger: 'ON_CLICK', bar: 'x' }],
        })
      ).toThrow();
    });

    test('should narrow trigger literals to the intersection with supported triggers', () => {
      const drilldownsSchema = registry.getSchema(['ON_CLICK', 'ON_ROW_CLICK']);
      expect(() =>
        drilldownsSchema.validate({
          drilldowns: [
            { type: 'bar_drilldown', label: 'b', trigger: 'ON_CLICK', bar: 'x' },
            {
              type: 'foo_drilldown',
              label: 'f',
              trigger: 'ON_ROW_CLICK',
              foo: 'y',
            },
          ],
        })
      ).not.toThrow();

      expect(() =>
        drilldownsSchema.validate({
          drilldowns: [
            {
              type: 'foo_drilldown',
              label: 'f',
              trigger: 'ON_HOVER',
              foo: 'y',
            },
          ],
        })
      ).toThrow();

      expect(() =>
        drilldownsSchema.validate({
          drilldowns: [
            {
              type: 'bar_drilldown',
              label: 'b',
              trigger: 'ON_ROW_CLICK',
              bar: 'x',
            },
          ],
        })
      ).toThrow();
    });
  });
});
