/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EnvironmentService } from './environment';

describe('EnvironmentService', () => {
  describe('setup', () => {
    test('allows multiple update calls', () => {
      const setup = new EnvironmentService().setup();
      expect(() => {
        setup.update({ ml: true });
        setup.update({ apmUi: true });
      }).not.toThrow();
    });
  });

  describe('getEnvironment', () => {
    test('returns default values', () => {
      const service = new EnvironmentService();
      expect(service.getEnvironment()).toEqual({ ml: false, cloud: false, apmUi: false });
    });

    test('returns last state of update calls', () => {
      const service = new EnvironmentService();
      const setup = service.setup();
      setup.update({ ml: true, cloud: true });
      setup.update({ ml: false, apmUi: true });
      expect(service.getEnvironment()).toEqual({ ml: false, cloud: true, apmUi: true });
    });
  });
});
