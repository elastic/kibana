/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveStepInput } from '.';

const makeContextManager = (rendered?: Record<string, unknown>) => ({
  renderValueAccordingToContext: jest.fn((v: unknown) => rendered ?? v),
});

describe('resolveStepInput', () => {
  it('returns empty object when withConfig is undefined', () => {
    const contextManager = makeContextManager();

    const result = resolveStepInput(undefined, contextManager as any);

    expect(result).toEqual({});
    expect(contextManager.renderValueAccordingToContext).toHaveBeenCalledWith({});
  });

  it('passes withConfig to renderValueAccordingToContext', () => {
    const withConfig = { foo: 'bar', baz: '{{context.baz}}' };
    const contextManager = makeContextManager();

    resolveStepInput(withConfig, contextManager as any);

    expect(contextManager.renderValueAccordingToContext).toHaveBeenCalledWith(withConfig);
  });

  it('returns the rendered value from contextManager', () => {
    const withConfig = { key: 'value' };
    const rendered = { key: 'rendered_value' };
    const contextManager = makeContextManager(rendered);

    const result = resolveStepInput(withConfig, contextManager as any);

    expect(result).toEqual(rendered);
  });
});
