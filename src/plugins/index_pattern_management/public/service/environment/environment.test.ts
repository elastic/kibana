/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EnvironmentService } from './environment';
import { MlCardState } from '../../types';

describe('EnvironmentService', () => {
  describe('setup', () => {
    test('allows multiple update calls', () => {
      const setup = new EnvironmentService().setup();
      expect(() => {
        setup.update({ ml: () => MlCardState.ENABLED });
      }).not.toThrow();
    });
  });

  describe('getEnvironment', () => {
    test('returns default values', () => {
      const service = new EnvironmentService();
      expect(service.getEnvironment().ml()).toEqual(MlCardState.DISABLED);
    });

    test('returns last state of update calls', () => {
      let cardState = MlCardState.DISABLED;
      const service = new EnvironmentService();
      const setup = service.setup();
      setup.update({ ml: () => cardState });
      expect(service.getEnvironment().ml()).toEqual(MlCardState.DISABLED);
      cardState = MlCardState.ENABLED;
      expect(service.getEnvironment().ml()).toEqual(MlCardState.ENABLED);
    });
  });
});
