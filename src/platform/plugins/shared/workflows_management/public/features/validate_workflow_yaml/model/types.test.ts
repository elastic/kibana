/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BATCHED_CUSTOM_MARKER_OWNER,
  CUSTOM_YAML_VALIDATION_MARKER_OWNERS,
  isYamlValidationMarkerOwner,
} from './types';

describe('isYamlValidationMarkerOwner', () => {
  it.each([...CUSTOM_YAML_VALIDATION_MARKER_OWNERS])(
    'returns true for custom owner "%s"',
    (owner) => {
      expect(isYamlValidationMarkerOwner(owner)).toBe(true);
    }
  );

  it('returns true for the "yaml" owner', () => {
    expect(isYamlValidationMarkerOwner('yaml')).toBe(true);
  });

  it('returns true for the batched custom marker owner', () => {
    expect(isYamlValidationMarkerOwner(BATCHED_CUSTOM_MARKER_OWNER)).toBe(true);
  });

  it('returns false for an unrelated owner', () => {
    expect(isYamlValidationMarkerOwner('typescript')).toBe(false);
    expect(isYamlValidationMarkerOwner('some-random-owner')).toBe(false);
    expect(isYamlValidationMarkerOwner('')).toBe(false);
  });
});
