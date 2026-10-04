/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { config, resolveExperimentalStepsConfig } from './config';

describe('workflows_extensions config', () => {
  describe('resolveExperimentalStepsConfig', () => {
    it('enables all experimental steps when set to true', () => {
      expect(resolveExperimentalStepsConfig(true)).toEqual({
        javaScriptStep: true,
      });
    });

    it('disables all experimental steps when set to false', () => {
      expect(resolveExperimentalStepsConfig(false)).toEqual({
        javaScriptStep: false,
      });
    });

    it('returns granular settings when an object is provided', () => {
      expect(resolveExperimentalStepsConfig({ javaScriptStep: true })).toEqual({
        javaScriptStep: true,
      });
    });
  });

  describe('schema', () => {
    it('accepts a boolean value', () => {
      expect(config.schema.validate({ experimentalSteps: true })).toEqual({
        experimentalSteps: true,
      });
    });

    it('accepts a granular object value', () => {
      expect(config.schema.validate({ experimentalSteps: { javaScriptStep: true } })).toEqual({
        experimentalSteps: { javaScriptStep: true },
      });
    });

    it('defaults experimentalSteps to false when omitted', () => {
      expect(config.schema.validate({})).toEqual({
        experimentalSteps: false,
      });
    });

    it('defaults omitted object keys to false', () => {
      expect(config.schema.validate({ experimentalSteps: {} })).toEqual({
        experimentalSteps: { javaScriptStep: false },
      });
    });
  });
});
