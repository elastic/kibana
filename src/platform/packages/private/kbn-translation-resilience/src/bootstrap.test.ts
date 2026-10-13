/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

describe('translation resilience bootstrap', () => {
  const loadBootstrap = () => {
    jest.resetModules();
    jest.doMock('translation-resilience', () => ({
      installTranslationResilience: jest.fn(),
    }));
    require('./bootstrap');
    return jest.requireMock('translation-resilience').installTranslationResilience as jest.Mock;
  };

  it('installs the patch lazily', () => {
    const installTranslationResilience = loadBootstrap();

    expect(installTranslationResilience).toHaveBeenCalledWith({
      eager: false,
      onEvent: expect.any(Function),
    });
  });

  it('forwards library events to the telemetry emitter once it is registered', () => {
    const installTranslationResilience = loadBootstrap();
    const onEvent = installTranslationResilience.mock.calls[0][0].onEvent as (
      message: string
    ) => void;
    const emit = jest.fn();
    window.__kbnTranslationsTelemetryEmitter__ = emit;

    onEvent('translation signal detected, observing document');

    expect(emit).toHaveBeenCalledWith('translation signal detected, observing document');

    delete window.__kbnTranslationsTelemetryEmitter__;
    onEvent('later');

    expect(emit).toHaveBeenCalledTimes(1);
  });
});
