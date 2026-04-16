/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runVisualStep } from './run_visual_step';

describe('runVisualStep', () => {
  beforeEach(() => {
    delete process.env.SCOUT_VISUAL_REGRESSION_ENABLED;
  });

  it('runs the body without capturing when visual regression is disabled', async () => {
    const capture = jest.fn();

    const value = await runVisualStep({
      snapshot: true,
      body: async () => 'done',
      capture,
    });

    expect(value).toBe('done');
    expect(capture).not.toHaveBeenCalled();
  });

  it('does not capture when snapshot is explicitly disabled', async () => {
    process.env.SCOUT_VISUAL_REGRESSION_ENABLED = 'true';
    const capture = jest.fn();

    await runVisualStep({
      snapshot: false,
      body: async () => undefined,
      capture,
    });

    expect(capture).not.toHaveBeenCalled();
  });
});
