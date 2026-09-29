/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type * as ReactQuery from '..';

vi.mock('..', async () => {
  const actual = await vi.importActual<typeof ReactQuery>('..');
  return {
    ...actual,
    useMutation: vi.fn(actual.useMutation),
    useQuery: vi.fn(actual.useQuery),
    useQueryClient: vi.fn(actual.useQueryClient),
  };
});
