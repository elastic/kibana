/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { parseServerFlags } from './flags';

describe('parseServerFlags', () => {
  it(`should throw an error with incorrect '--arch' flag`, () => {
    const flags = new FlagsReader({
      location: 'cloud',
      arch: 'agentic',
      domain: 'security_complete',
      logToFile: false,
      headed: false,
    });

    expect(() => parseServerFlags(flags)).toThrow(
      /Scout test target validation discovered 1 issue\(s\):\n - arch/
    );
  });

  it(`should parse with correct config and serverless flags`, () => {
    const flags = new FlagsReader({
      location: 'local',
      arch: 'serverless',
      domain: 'observability_complete',
      headed: false,
      logToFile: false,
      serverConfigSet: 'default',
    });
    const result = parseServerFlags(flags);

    expect(result).toEqual({
      esFrom: undefined,
      installDir: undefined,
      logsDir: undefined,
      serverConfigSet: 'default',
      testTarget: {
        arch: 'serverless',
        domain: 'observability_complete',
        location: 'local',
      },
    });
  });

  it(`should parse with correct config and stateful flags`, () => {
    const flags = new FlagsReader({
      location: 'cloud',
      arch: 'stateful',
      domain: 'observability_complete',
      esFrom: 'snapshot',
      logToFile: false,
      serverConfigSet: 'default',
    });
    const result = parseServerFlags(flags);

    expect(result).toEqual({
      esFrom: 'snapshot',
      installDir: undefined,
      logsDir: undefined,
      serverConfigSet: 'default',
      testTarget: {
        arch: 'stateful',
        domain: 'observability_complete',
        location: 'cloud',
      },
    });
  });

  it(`should parse serverConfigSet flag`, () => {
    const flags = new FlagsReader({
      location: 'cloud',
      arch: 'stateful',
      domain: 'classic',
      logToFile: false,
      serverConfigSet: 'uiam_local',
    });
    const result = parseServerFlags(flags);

    expect(result).toEqual({
      esFrom: undefined,
      installDir: undefined,
      logsDir: undefined,
      serverConfigSet: 'uiam_local',
      testTarget: {
        arch: 'stateful',
        domain: 'classic',
        location: 'cloud',
      },
    });
  });
});
