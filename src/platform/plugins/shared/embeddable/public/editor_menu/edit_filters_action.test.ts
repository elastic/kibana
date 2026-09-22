/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EditFiltersAction } from './edit_filters_action';

describe('edit filters editor action', () => {
  const action = new EditFiltersAction();
  const writableSearchApi = {
    filters$: {},
    query$: {},
    timeRange$: {},
    setFilters: jest.fn(),
    setQuery: jest.fn(),
    setTimeRange: jest.fn(),
  };

  it('is compatible when the panel publishes writable unified search and the editor can mount the body', async () => {
    expect(await action.isCompatible?.({ editor: { type: 'test' } })).toBe(false);
    expect(
      await action.isCompatible?.({
        api: writableSearchApi,
        editor: { type: 'test' },
      })
    ).toBe(false);
    expect(
      await action.isCompatible?.({
        api: { ...writableSearchApi, setFilters: undefined },
        editor: { type: 'test', mountFiltersBody: jest.fn() },
      })
    ).toBe(false);
    expect(
      await action.isCompatible?.({
        api: writableSearchApi,
        editor: { type: 'test', mountFiltersBody: jest.fn() },
      })
    ).toBe(true);
  });

  it('mounts the filters body into the flyout the editor already opened', async () => {
    const mountFiltersBody = jest.fn();
    await action.execute({ editor: { type: 'test', mountFiltersBody } });
    expect(mountFiltersBody).toHaveBeenCalledWith(expect.any(Function));
  });
});
