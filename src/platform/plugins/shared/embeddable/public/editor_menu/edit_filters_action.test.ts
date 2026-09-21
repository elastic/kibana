/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEditFiltersAction } from './edit_filters_action';

describe('edit filters editor action', () => {
  const action = getEditFiltersAction();

  it('is compatible only when the editor supports filters', async () => {
    expect(await action.isCompatible?.({ editor: { type: 'test' } })).toBe(false);
    expect(await action.isCompatible?.({ editor: { type: 'test', openFilters: jest.fn() } })).toBe(
      true
    );
  });

  it('delegates execution to the editor session', async () => {
    const openFilters = jest.fn();
    const anchor = document.createElement('button');
    await action.execute({ editor: { type: 'test', openFilters }, anchor });
    expect(openFilters).toHaveBeenCalledWith(anchor);
  });
});
