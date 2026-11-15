/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsMigrationConfig } from './saved_objects_config';

const validate = (config: Record<string, unknown>) =>
  savedObjectsMigrationConfig.schema.validate(config);

describe('migrations config', () => {
  it.each(['v2', 'zdt', 'v3'])('accepts the %s algorithm', (algorithm) => {
    expect(validate({ algorithm }).algorithm).toBe(algorithm);
  });

  it('defaults to the v2 algorithm', () => {
    expect(validate({}).algorithm).toBe('v2');
  });

  it('rejects unknown algorithms', () => {
    expect(() => validate({ algorithm: 'v4' })).toThrow();
  });
});
