/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { initializeControlGroupTelemetry } from './control_group_constants';
import { ControlGroupTelemetry } from './types';

describe('Control group constants', () => {
  describe('Initialize telemetry', () => {
    test('initializes telemetry when given blank object', () => {
      const initializedTelemetry = initializeControlGroupTelemetry({});
      expect(initializedTelemetry.total).toBe(0);
      expect(initializedTelemetry.chaining_system).toEqual({});
      expect(initializedTelemetry.ignore_settings).toEqual({});
      expect(initializedTelemetry.by_type).toEqual({});
    });

    test('initializes telemetry without overwriting any keys when given a partial telemetry object', () => {
      const partialTelemetry: Partial<ControlGroupTelemetry> = {
        total: 77,
        chaining_system: { TESTCHAIN: 10, OTHERCHAIN: 1 },
        by_type: { test1: { total: 10, details: {} } },
      };
      const initializedTelemetry = initializeControlGroupTelemetry(partialTelemetry);
      expect(initializedTelemetry.total).toBe(77);
      expect(initializedTelemetry.chaining_system).toEqual({ TESTCHAIN: 10, OTHERCHAIN: 1 });
      expect(initializedTelemetry.ignore_settings).toEqual({});
      expect(initializedTelemetry.by_type).toEqual({ test1: { total: 10, details: {} } });
      expect(initializedTelemetry.label_position).toEqual({});
    });

    test('initiailizes telemetry without overwriting any keys when given a completed telemetry object', () => {
      const partialTelemetry: Partial<ControlGroupTelemetry> = {
        total: 5,
        chaining_system: { TESTCHAIN: 10, OTHERCHAIN: 1 },
        by_type: { test1: { total: 10, details: {} } },
        ignore_settings: { ignoreValidations: 12 },
        label_position: { inline: 10, above: 12 },
      };
      const initializedTelemetry = initializeControlGroupTelemetry(partialTelemetry);
      expect(initializedTelemetry.total).toBe(5);
      expect(initializedTelemetry.chaining_system).toEqual({ TESTCHAIN: 10, OTHERCHAIN: 1 });
      expect(initializedTelemetry.ignore_settings).toEqual({ ignoreValidations: 12 });
      expect(initializedTelemetry.by_type).toEqual({ test1: { total: 10, details: {} } });
      expect(initializedTelemetry.label_position).toEqual({ inline: 10, above: 12 });
    });
  });
});
