/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPortFromEnv } from './common';

describe('getPortFromEnv', () => {
  const ENV_VAR = 'SCOUT_TEST_PORT_FROM_ENV';

  afterEach(() => {
    delete process.env[ENV_VAR];
  });

  it('returns the default when the variable is unset or empty', () => {
    expect(getPortFromEnv(ENV_VAR, 9220)).toBe(9220);

    process.env[ENV_VAR] = '';
    expect(getPortFromEnv(ENV_VAR, 9220)).toBe(9220);
  });

  it('returns the port from the variable', () => {
    process.env[ENV_VAR] = '9240';
    expect(getPortFromEnv(ENV_VAR, 9220)).toBe(9240);
  });

  it.each(['abc', '92x0', '0', '65536', '92.5'])('throws on invalid value %p', (value) => {
    process.env[ENV_VAR] = value;
    expect(() => getPortFromEnv(ENV_VAR, 9220)).toThrow(
      `process.env.${ENV_VAR} must contain a valid port. given: ${value}`
    );
  });
});
