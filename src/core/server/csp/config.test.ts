/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { config } from './config';

describe('config.validate()', () => {
  test(`does not allow "disableEmbedding" to be set to true`, () => {
    // This is intentionally not editable in the raw CSP config.
    // Users should set `server.securityResponseHeaders.disableEmbedding` to control this config property.
    expect(() => config.schema.validate({ disableEmbedding: true })).toThrowError(
      '[disableEmbedding]: expected value to equal [false]'
    );
  });
});
