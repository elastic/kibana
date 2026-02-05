/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseCliFlags } from './parse_cli_flags';
import type { CliFlags } from './types';

describe('parseCliFlags', () => {
  it('parses valid flags correctly', () => {
    const flags: CliFlags = {
      references: true,
      stats: ['any', 'comments'],
      plugin: ['plugin1', 'plugin2'],
    };

    const result = parseCliFlags(flags);

    expect(result.collectReferences).toBe(true);
    expect(result.stats).toEqual(['any', 'comments']);
    expect(result.pluginFilter).toEqual(['plugin1', 'plugin2']);
  });

  it('normalizes single string plugin to array', () => {
    const flags: CliFlags = {
      plugin: 'single-plugin',
    };

    const result = parseCliFlags(flags);

    expect(result.pluginFilter).toEqual(['single-plugin']);
  });

  it('normalizes single string stats to array', () => {
    const flags: CliFlags = {
      stats: 'any',
    };

    const result = parseCliFlags(flags);

    expect(result.stats).toEqual(['any']);
  });

  it('handles undefined flags', () => {
    const flags: CliFlags = {};

    const result = parseCliFlags(flags);

    expect(result.collectReferences).toBe(false);
    expect(result.stats).toBeUndefined();
    expect(result.pluginFilter).toBeUndefined();
  });

  it('throws error for invalid plugin filter type', () => {
    const flags: CliFlags = {
      plugin: { invalid: 'object' } as any,
    };

    expect(() => parseCliFlags(flags)).toThrow('expected --plugin must only contain strings');
  });

  it('throws error for invalid stats values', () => {
    const flags: CliFlags = {
      stats: ['invalid-value'],
    };

    expect(() => parseCliFlags(flags)).toThrow(
      'expected --stats must only contain `any`, `comments` and/or `exports`'
    );
  });

  it('throws error for invalid stats type', () => {
    const flags: CliFlags = {
      stats: { invalid: 'object' } as any,
    };

    expect(() => parseCliFlags(flags)).toThrow(
      'expected --stats must only contain `any`, `comments` and/or `exports`'
    );
  });

  it('accepts valid stats values', () => {
    const flags: CliFlags = {
      stats: ['any', 'comments', 'exports'],
    };

    const result = parseCliFlags(flags);

    expect(result.stats).toEqual(['any', 'comments', 'exports']);
  });

  it('handles references flag correctly', () => {
    const flags: CliFlags = {
      references: true,
    };

    const result = parseCliFlags(flags);

    expect(result.collectReferences).toBe(true);
  });

  it('handles references flag as false when not provided', () => {
    const flags: CliFlags = {};

    const result = parseCliFlags(flags);

    expect(result.collectReferences).toBe(false);
  });
});
