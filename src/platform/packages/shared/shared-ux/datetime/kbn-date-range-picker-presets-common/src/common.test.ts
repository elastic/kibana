/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_STORED_PRESETS, mergePresets, migrateStoredPresets } from './common';

const quickRanges = [
  { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
  { start: 'now/d', end: 'now/d', label: 'Today' },
];

describe('migrateStoredPresets', () => {
  it('migrates missing stored presets to an empty user list', () => {
    expect(migrateStoredPresets(undefined, quickRanges)).toEqual(DEFAULT_STORED_PRESETS);
  });

  it('keeps v2 stored presets unchanged', () => {
    const storedPresets = {
      version: 2 as const,
      presets: [{ start: 'now-7d', end: 'now', label: 'Last 7 days' }],
    };

    expect(migrateStoredPresets(storedPresets, quickRanges)).toBe(storedPresets);
  });

  it('migrates an unseeded v1 value to an empty user list', () => {
    expect(migrateStoredPresets({ version: 1, presets: null }, quickRanges)).toEqual(
      DEFAULT_STORED_PRESETS
    );
  });

  it('subtracts the current quick ranges from a seeded v1 value', () => {
    const storedPresets = {
      version: 1 as const,
      presets: [
        { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
        { start: 'now/d', end: 'now/d', label: 'Today' },
        { start: 'now-7d', end: 'now', label: 'Last 7 days' },
      ],
    };

    expect(migrateStoredPresets(storedPresets, quickRanges)).toEqual({
      version: 2,
      presets: [{ start: 'now-7d', end: 'now', label: 'Last 7 days' }],
    });
  });

  it('matches quick ranges by bounds, ignoring the label', () => {
    const storedPresets = {
      version: 1 as const,
      presets: [{ start: 'now-15m', end: 'now', label: 'Renamed by the admin' }],
    };

    expect(migrateStoredPresets(storedPresets, quickRanges).presets).toEqual([]);
  });

  it('keeps a v1 entry whose quick range no longer exists', () => {
    const storedPresets = {
      version: 1 as const,
      presets: [{ start: 'now-30m', end: 'now', label: 'Last 30 minutes' }],
    };

    expect(migrateStoredPresets(storedPresets, quickRanges).presets).toEqual(storedPresets.presets);
  });
});

describe('mergePresets', () => {
  it('lists deletable user presets before locked quick ranges', () => {
    const userPresets = [{ start: 'now-7d', end: 'now', label: 'Last 7 days' }];

    expect(mergePresets(userPresets, quickRanges)).toEqual([
      { start: 'now-7d', end: 'now', label: 'Last 7 days', isDeletable: true },
      { start: 'now-15m', end: 'now', label: 'Last 15 minutes', isDeletable: false },
      { start: 'now/d', end: 'now/d', label: 'Today', isDeletable: false },
    ]);
  });

  it('drops a quick range already present as a user preset', () => {
    const userPresets = [{ start: 'now/d', end: 'now/d', label: 'My today' }];

    expect(mergePresets(userPresets, quickRanges)).toEqual([
      { start: 'now/d', end: 'now/d', label: 'My today', isDeletable: true },
      { start: 'now-15m', end: 'now', label: 'Last 15 minutes', isDeletable: false },
    ]);
  });

  it('returns only locked quick ranges when the user has none', () => {
    expect(mergePresets([], quickRanges)).toEqual([
      { start: 'now-15m', end: 'now', label: 'Last 15 minutes', isDeletable: false },
      { start: 'now/d', end: 'now/d', label: 'Today', isDeletable: false },
    ]);
  });
});
