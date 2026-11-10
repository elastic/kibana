/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HousekeepingResourceProvider } from './types';

export const indicesProvider = (
  overrides: Partial<HousekeepingResourceProvider> = {}
): HousekeepingResourceProvider => ({
  id: 'indices',
  title: 'Indices',
  resourceTypes: [{ id: 'index', label: 'Index' }],
  referencedTypes: ['pipeline'],
  listResources: async () => [],
  ...overrides,
});

export const pipelinesProvider = (
  overrides: Partial<HousekeepingResourceProvider> = {}
): HousekeepingResourceProvider => ({
  id: 'pipelines',
  title: 'Pipelines',
  resourceTypes: [
    {
      id: 'pipeline',
      label: 'Pipeline',
      unused: {
        message: 'Nothing uses it',
        getFix: (id) => ({ description: 'Deletes it', request: `DELETE _pipeline/${id}` }),
      },
    },
  ],
  referencedTypes: ['pipeline'],
  listResources: async () => [],
  ...overrides,
});
