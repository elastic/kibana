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
  it(`should throw an error with '--stateful' flag as string value`, () => {
    const flags = new FlagsReader({
      stateful: 'true',
      logToFile: false,
    });

    expect(() => parseServerFlags(flags)).toThrow('expected --stateful to be a boolean');
  });

  it(`should throw an error with '--serverless' flag as boolean`, () => {
    const flags = new FlagsReader({
      serverless: true,
      logToFile: false,
    });

    expect(() => parseServerFlags(flags)).toThrow('expected --serverless to be a string');
  });

  it(`should throw an error with incorrect '--serverless' flag`, () => {
    const flags = new FlagsReader({
      serverless: 'a',
      logToFile: false,
    });

    expect(() => parseServerFlags(flags)).toThrow(
      'invalid --serverless, expected one of "es", "oblt", "oblt-logs-essentials", "security"'
    );
  });

  it(`should parse with correct config and serverless flags`, () => {
    const flags = new FlagsReader({
      stateful: false,
      serverless: 'oblt',
      logToFile: false,
    });
    const result = parseServerFlags(flags);

    expect(result).toEqual({
      mode: 'serverless=oblt',
      esFrom: undefined,
      installDir: undefined,
      configDir: undefined,
      logsDir: undefined,
    });
  });

  it(`should parse with correct config and stateful flags`, () => {
    const flags = new FlagsReader({
      stateful: true,
      logToFile: false,
      esFrom: 'snapshot',
    });
    const result = parseServerFlags(flags);

    expect(result).toEqual({
      mode: 'stateful',
      esFrom: 'snapshot',
      installDir: undefined,
      configDir: undefined,
      logsDir: undefined,
    });
  });

  it(`should parse config-dir flag`, () => {
    const flags = new FlagsReader({
      stateful: true,
      logToFile: false,
      'config-dir': 'uiam_local',
    });
    const result = parseServerFlags(flags);

    expect(result).toEqual({
      mode: 'stateful',
      esFrom: undefined,
      installDir: undefined,
      configDir: 'uiam_local',
      logsDir: undefined,
    });
  });
});
