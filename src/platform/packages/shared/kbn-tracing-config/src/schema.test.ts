/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tracingConfigSchema } from './schema';

describe('tracingConfigSchema browser', () => {
  it('is disabled by default', () => {
    expect(tracingConfigSchema.validate({}).browser).toEqual({ enabled: false });
  });

  it('accepts an enabled config with a url and headers', () => {
    const browser = { enabled: true, url: 'https://otlp.example.com', headers: { a: 'b' } };
    expect(tracingConfigSchema.validate({ browser }).browser).toEqual(browser);
  });

  it('requires a url when enabled', () => {
    expect(() => tracingConfigSchema.validate({ browser: { enabled: true } })).toThrow(
      /url is required/
    );
  });

  it('rejects a url with credentials', () => {
    expect(() =>
      tracingConfigSchema.validate({
        browser: { enabled: true, url: 'https://user:pass@otlp.example.com' },
      })
    ).toThrow(/must not contain credentials/);
  });
});
