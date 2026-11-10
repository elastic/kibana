/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreConfig } from './core_config';

describe('core config schema', () => {
  test('defaults earlyStartHttp to false', () => {
    expect(coreConfig.schema.validate({})).toEqual({
      lifecycle: { disablePreboot: false },
      enableStripUnknownConfigWorkaround: false,
      earlyStartHttp: false,
    });
  });

  test('accepts earlyStartHttp', () => {
    expect(coreConfig.schema.validate({ earlyStartHttp: true }).earlyStartHttp).toBe(true);
    expect(coreConfig.schema.validate({ earlyStartHttp: false }).earlyStartHttp).toBe(false);
  });
});
