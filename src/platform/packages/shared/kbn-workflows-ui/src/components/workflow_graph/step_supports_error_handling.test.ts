/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  stepSupportsErrorHandling,
  stepSupportsErrorHandlingSettings,
} from './step_supports_error_handling';

describe('step error handling support', () => {
  it.each(['console', 'slack', 'elasticsearch.search', 'data.set', 'switch'])(
    '%s: a fallback port on the canvas and the panel section',
    (type) => {
      expect(stepSupportsErrorHandling(type)).toBe(true);
      expect(stepSupportsErrorHandlingSettings(type)).toBe(true);
    }
  );

  it.each(['foreach', 'while'])(
    '%s: the panel section, but no fallback port on its canvas node',
    (type) => {
      expect(stepSupportsErrorHandling(type)).toBe(false);
      expect(stepSupportsErrorHandlingSettings(type)).toBe(true);
    }
  );

  it.each(['if', 'parallel', 'merge', 'atomic', undefined])('%s: neither', (type) => {
    expect(stepSupportsErrorHandling(type)).toBe(false);
    expect(stepSupportsErrorHandlingSettings(type)).toBe(false);
  });
});
