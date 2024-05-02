/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ruleDefinitionSlice,
  setIntervalNumber,
  setIntervalUnit,
  initializeAndValidateConsumer,
  initialState,
} from './slice';

describe('ruleDefinition slice', () => {
  describe('setIntervalNumber', () => {
    test('should set interval number and preserve interval unit', () => {
      const state = ruleDefinitionSlice.reducer(initialState, setIntervalNumber(5));
      expect(state.schedule.interval).toBe('5m');
    });
  });

  describe('setIntervalUnit', () => {
    test('should set interval unit and preserve interval number', () => {
      const state = ruleDefinitionSlice.reducer(initialState, setIntervalUnit('h'));
      expect(state.schedule.interval).toBe('1h');
    });
  });

  describe('initializeAndValidateConsumer', () => {
    test('should set the first valid consumer if stackAlerts is not present', () => {
      const state = ruleDefinitionSlice.reducer(
        initialState,
        initializeAndValidateConsumer(['logs', 'infrastructure'])
      );
      expect(state.consumer).toBe('logs');
    });

    test('should always set consumer to stackAlerts if it is included in the validConsumers', () => {
      const state = ruleDefinitionSlice.reducer(
        initialState,
        initializeAndValidateConsumer(['logs', 'infrastructure', 'stackAlerts'])
      );
      expect(state.consumer).toBe('stackAlerts');
    });

    test('should keep the initial consumer if it is valid', () => {
      const state = ruleDefinitionSlice.reducer(
        { ...initialState, consumer: 'infrastructure' },
        initializeAndValidateConsumer(['logs', 'infrastructure', 'stackAlerts'])
      );
      expect(state.consumer).toBe('infrastructure');
    });

    test('should not set a consumer if the initial consumer is null', () => {
      const state = ruleDefinitionSlice.reducer(
        { ...initialState, consumer: null },
        initializeAndValidateConsumer(['logs', 'infrastructure', 'stackAlerts'])
      );
      expect(state.consumer).toBe(null);
    });
  });
});
