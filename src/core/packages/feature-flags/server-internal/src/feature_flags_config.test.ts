/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { featureFlagsConfig } from './feature_flags_config';

describe('FeatureFlagsConfig schema validation', () => {
  it('accepts enableAllFlags as optional boolean', () => {
    const validConfig = {
      enableAllFlags: true,
    };

    expect(() => featureFlagsConfig.schema.validate(validConfig)).not.toThrow();
  });


  it('accepts both enableAllFlags and overrides together', () => {
    const validConfig = {
      enableAllFlags: true,
      overrides: {
        'my.flag': false,
        'another.flag': 'custom-value',
      },
    };

    expect(() => featureFlagsConfig.schema.validate(validConfig)).not.toThrow();
  });

  it('accepts empty config object', () => {
    const validConfig = {};

    expect(() => featureFlagsConfig.schema.validate(validConfig)).not.toThrow();
  });

  it('fails validation with invalid enableAllFlags type', () => {
    const invalidConfig = {
      enableAllFlags: 'not-a-boolean',
    };

    expect(() => featureFlagsConfig.schema.validate(invalidConfig)).toThrow();
  });
