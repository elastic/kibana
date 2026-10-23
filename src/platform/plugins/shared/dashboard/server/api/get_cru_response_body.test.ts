/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
import { getDashboardCRUResponseBody } from './get_cru_response_body';
import { transformDashboardOut } from './transforms';

jest.mock('./transforms', () => ({
  transformDashboardOut: jest.fn().mockReturnValue({
    dashboardState: { title: 'Test' },
    warnings: [],
  }),
}));

jest.mock('./scope_tooling', () => ({
  stripUnmappedKeys: jest.fn((data) => ({ data, warnings: [] })),
}));

const savedObject = {
  id: 'dashboard-id',
  type: 'dashboard',
  attributes: { title: 'Test' },
  references: [],
} as unknown as SavedObject<DashboardSavedObjectAttributes>;

describe('getDashboardCRUResponseBody', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each([
    ['read', true],
    ['create', false],
    ['update', false],
  ] as const)('%s sets migratePanelTypes to %s', (operation, migratePanelTypes) => {
    getDashboardCRUResponseBody(savedObject, operation, jest.fn() as never);

    expect(jest.mocked(transformDashboardOut).mock.calls[0][4]).toBe(migratePanelTypes);
  });
});
