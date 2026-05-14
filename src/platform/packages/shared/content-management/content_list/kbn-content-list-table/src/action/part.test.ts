/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionBuilderContext } from './types';
import { resolveCustomAction } from './part';

const defaultContext: ActionBuilderContext = {
  isReadOnly: false,
  entityName: 'dashboard',
  supports: {
    sorting: true,
    pagination: true,
    search: true,
    selection: true,
    tags: false,
    starred: false,
    userProfiles: false,
  },
};

describe('custom action resolver', () => {
  it('uses a per-item disabled reason when provided', () => {
    const result = resolveCustomAction(
      {
        id: 'archive',
        name: 'Archive',
        disabledReason: (item) =>
          item.id === 'managed' ? 'Managed items cannot archive' : undefined,
      },
      defaultContext
    );
    const description = result.description as (item: { id: string }) => string | undefined;

    expect(description({ id: 'managed' })).toBe('Managed items cannot archive');
    expect(description({ id: 'open' })).toBeUndefined();
  });

  it('falls back to the custom description when no disabled reason is returned', () => {
    const result = resolveCustomAction(
      {
        id: 'archive',
        name: 'Archive',
        description: (item) => `Archive ${item.title}`,
        disabledReason: (item) =>
          item.id === 'managed' ? 'Managed items cannot archive' : undefined,
      },
      defaultContext
    );
    const description = result.description as (item: { id: string; title: string }) => string;

    expect(description({ id: 'managed', title: 'Managed' })).toBe('Managed items cannot archive');
    expect(description({ id: 'open', title: 'Open' })).toBe('Archive Open');
  });
});
