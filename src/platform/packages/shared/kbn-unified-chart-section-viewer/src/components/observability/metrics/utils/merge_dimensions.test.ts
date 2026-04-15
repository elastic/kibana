/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeDimensions } from './merge_dimensions';
import type { Dimension } from '../../../../types';

describe('mergeDimensions', () => {
  const dim = (name: string, type?: string): Dimension => ({ name, type });

  it('returns incoming dimensions when accumulated is empty', () => {
    const incoming = [dim('host.name'), dim('environment')];
    expect(mergeDimensions([], incoming)).toEqual([dim('environment'), dim('host.name')]);
  });

  it('returns accumulated dimensions when incoming is empty', () => {
    const accumulated = [dim('host.name'), dim('environment')];
    expect(mergeDimensions(accumulated, [])).toEqual([dim('environment'), dim('host.name')]);
  });

  it('returns empty array when both are empty', () => {
    expect(mergeDimensions([], [])).toEqual([]);
  });

  it('preserves accumulated dimensions that are missing from incoming (the bug scenario)', () => {
    // Step 1: unfiltered query returns all 3 dimensions
    const allDimensions = [dim('environment'), dim('host.name'), dim('region')];

    // Step 2: user selects environment + host.name, filtered query returns only 2
    const filteredDimensions = [dim('environment'), dim('host.name')];

    const result = mergeDimensions(allDimensions, filteredDimensions);

    // region should still be present
    expect(result).toEqual([dim('environment'), dim('host.name'), dim('region')]);
    expect(result.map((d) => d.name)).toContain('region');
  });

  it('deduplicates dimensions by name', () => {
    const accumulated = [dim('host.name'), dim('environment')];
    const incoming = [dim('host.name'), dim('region')];

    const result = mergeDimensions(accumulated, incoming);
    expect(result).toEqual([dim('environment'), dim('host.name'), dim('region')]);

    // No duplicates
    const names = result.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('incoming dimensions update type info for existing entries', () => {
    const accumulated = [dim('host.name', 'keyword'), dim('environment')];
    const incoming = [dim('host.name', 'ip')];

    const result = mergeDimensions(accumulated, incoming);

    const hostDim = result.find((d) => d.name === 'host.name');
    expect(hostDim?.type).toBe('ip');
  });

  it('sorts results alphabetically by name', () => {
    const accumulated = [dim('z_field'), dim('a_field')];
    const incoming = [dim('m_field')];

    const result = mergeDimensions(accumulated, incoming);
    expect(result.map((d) => d.name)).toEqual(['a_field', 'm_field', 'z_field']);
  });

  it('handles the full multi-step selection scenario', () => {
    // Step 1: initial unfiltered query
    const step1 = [dim('environment'), dim('host.name'), dim('region')];
    let accumulated = mergeDimensions([], step1);
    expect(accumulated.map((d) => d.name)).toEqual(['environment', 'host.name', 'region']);

    // Step 2: user selects environment, filtered query returns environment + host.name
    // (region is on a metric that may not have environment)
    const step2 = [dim('environment'), dim('host.name')];
    accumulated = mergeDimensions(accumulated, step2);
    expect(accumulated.map((d) => d.name)).toEqual(['environment', 'host.name', 'region']);

    // Step 3: user also selects host.name, filtered query returns only environment + host.name
    const step3 = [dim('environment'), dim('host.name')];
    accumulated = mergeDimensions(accumulated, step3);
    expect(accumulated.map((d) => d.name)).toEqual(['environment', 'host.name', 'region']);
  });
});
