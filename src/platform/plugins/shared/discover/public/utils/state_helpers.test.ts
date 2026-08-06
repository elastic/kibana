/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import { DEFAULT_COLUMNS_SETTING } from '@kbn/discover-utils';
import { SOURCE_COLUMN } from '@kbn/unified-data-table';
import { handleSourceColumnState } from './state_helpers';

const createUiSettings = (defaultColumns: string[] = []) =>
  ({
    get: (key: string) => (key === DEFAULT_COLUMNS_SETTING ? defaultColumns : undefined),
  } as unknown as IUiSettingsClient);

describe('handleSourceColumnState', () => {
  it('keeps mixed field and Summary columns unchanged', () => {
    const state = { columns: ['message', SOURCE_COLUMN] };
    expect(handleSourceColumnState(state, createUiSettings())).toEqual(state);
  });

  it('keeps field-only columns unchanged', () => {
    const state = { columns: ['message'] };
    expect(handleSourceColumnState(state, createUiSettings())).toEqual(state);
  });

  it('collapses sole Summary column to an empty list', () => {
    expect(handleSourceColumnState({ columns: [SOURCE_COLUMN] }, createUiSettings())).toEqual({
      columns: [],
    });
  });

  it('falls back to configured default columns when empty', () => {
    expect(handleSourceColumnState({ columns: [] }, createUiSettings(['bytes']))).toEqual({
      columns: ['bytes'],
    });
  });

  it('returns the state unchanged when columns are undefined', () => {
    const state = {};
    expect(handleSourceColumnState(state, createUiSettings())).toBe(state);
  });
});
