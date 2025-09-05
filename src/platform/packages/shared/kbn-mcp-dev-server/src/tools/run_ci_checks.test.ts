/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runCiChecksTool } from './run_ci_checks';

describe('runCiChecksTool', () => {
  it('should have the correct name', () => {
    expect(runCiChecksTool.name).toBe('run_ci_checks');
  });

  it('should have a description', () => {
    expect(runCiChecksTool.description).toBeTruthy();
    expect(typeof runCiChecksTool.description).toBe('string');
  });

  it('should have an input schema', () => {
    expect(runCiChecksTool.inputSchema).toBeDefined();
  });

  it('should have a handler function', () => {
    expect(runCiChecksTool.handler).toBeDefined();
    expect(typeof runCiChecksTool.handler).toBe('function');
  });

  it('should have default values for optional parameters', () => {
    const schema = runCiChecksTool.inputSchema;
    const defaults = schema.parse({});

    expect(defaults.checks).toEqual([
      'build',
      'quick_checks',
      'checks',
      'type_check',
      'linting_with_types',
      'linting',
      'oas_snapshot',
    ]);
    expect(defaults.parallel).toBe(true);
  });

  it('should accept custom checks', () => {
    const schema = runCiChecksTool.inputSchema;
    const customChecks = schema.parse({
      checks: ['build', 'type_check'],
    });

    expect(customChecks.checks).toEqual(['build', 'type_check']);
    expect(customChecks.parallel).toBe(true);
  });

  it('should accept custom parallel setting', () => {
    const schema = runCiChecksTool.inputSchema;
    const sequential = schema.parse({
      parallel: false,
    });

    expect(sequential.parallel).toBe(false);
  });
});
