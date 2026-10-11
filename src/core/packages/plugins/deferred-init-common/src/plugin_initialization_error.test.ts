/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PluginInitializationError,
  isPluginInitializationError,
} from './plugin_initialization_error';

describe('PluginInitializationError', () => {
  it('carries the plugin id and a default message', () => {
    const error = new PluginInitializationError('myPlugin');

    expect(error.pluginId).toBe('myPlugin');
    expect(error.message).toBe('Plugin "myPlugin" has not finished initializing; retry later.');
    expect(error.name).toBe('PluginInitializationError');
  });

  it('supports a custom message and cause', () => {
    const cause = new Error('lock timed out');
    const error = new PluginInitializationError('myPlugin', {
      message: 'custom message',
      cause,
    });

    expect(error.message).toBe('custom message');
    expect(error.cause).toBe(cause);
  });

  it('defaults to retriable', () => {
    const error = new PluginInitializationError('myPlugin');

    expect(error.retriable).toBe(true);
  });

  it('supports marking itself as non-retriable', () => {
    const error = new PluginInitializationError('myPlugin', {
      message: 'no runner attached',
      retriable: false,
    });

    expect(error.retriable).toBe(false);
  });

  it('carries the initialization state when provided, and is undefined otherwise', () => {
    expect(new PluginInitializationError('myPlugin').status).toBeUndefined();
    expect(new PluginInitializationError('myPlugin', { status: 'failed' }).status).toBe('failed');
  });
});

describe('isPluginInitializationError', () => {
  it('returns true for a PluginInitializationError instance', () => {
    expect(isPluginInitializationError(new PluginInitializationError('myPlugin'))).toBe(true);
  });

  it('returns true for an Error-like object with matching name (cross-realm)', () => {
    // Simulates an error thrown from a different JS realm (vm context, worker,
    // iframe, etc.) where `instanceof PluginInitializationError` is false
    // but the error's shape and name are preserved.
    const crossRealmError = Object.assign(new Error('not available'), {
      name: 'PluginInitializationError',
      pluginId: 'myPlugin',
    });

    expect(crossRealmError).not.toBeInstanceOf(PluginInitializationError);
    expect(isPluginInitializationError(crossRealmError)).toBe(true);
  });

  it('returns false for a plain Error', () => {
    expect(isPluginInitializationError(new Error('boom'))).toBe(false);
  });

  it('returns false for a subclassed Error whose name does not match', () => {
    class SomeOtherError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'SomeOtherError';
      }
    }

    expect(isPluginInitializationError(new SomeOtherError('boom'))).toBe(false);
  });
});
