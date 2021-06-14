/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { config } from './config';

describe('config.validate()', () => {
  it(`does not allow "disableEmbedding" to be set to true`, () => {
    // This is intentionally not editable in the raw CSP config.
    // Users should set `server.securityResponseHeaders.disableEmbedding` to control this config property.
    expect(() => config.schema.validate({ disableEmbedding: true })).toThrowError(
      '[disableEmbedding]: expected value to equal [false]'
    );
  });

  it('throws if both `rules` and `script_src` are specified', () => {
    expect(() =>
      config.schema.validate({
        rules: [
          `script-src 'unsafe-eval' 'self'`,
          `worker-src 'unsafe-eval' 'self'`,
          `style-src 'unsafe-eval' 'self'`,
        ],
        script_src: [`'self'`],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"\\"csp.rules\\" cannot be used when specifying per-directive additions such as \\"script_src\\", \\"worker_src\\" or \\"style_src\\""`
    );
  });

  it('throws if both `rules` and `worker_src` are specified', () => {
    expect(() =>
      config.schema.validate({
        rules: [
          `script-src 'unsafe-eval' 'self'`,
          `worker-src 'unsafe-eval' 'self'`,
          `style-src 'unsafe-eval' 'self'`,
        ],
        worker_src: [`'self'`],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"\\"csp.rules\\" cannot be used when specifying per-directive additions such as \\"script_src\\", \\"worker_src\\" or \\"style_src\\""`
    );
  });

  it('throws if both `rules` and `style_src` are specified', () => {
    expect(() =>
      config.schema.validate({
        rules: [
          `script-src 'unsafe-eval' 'self'`,
          `worker-src 'unsafe-eval' 'self'`,
          `style-src 'unsafe-eval' 'self'`,
        ],
        style_src: [`'self'`],
      })
    ).toThrowErrorMatchingInlineSnapshot(
      `"\\"csp.rules\\" cannot be used when specifying per-directive additions such as \\"script_src\\", \\"worker_src\\" or \\"style_src\\""`
    );
  });
});
