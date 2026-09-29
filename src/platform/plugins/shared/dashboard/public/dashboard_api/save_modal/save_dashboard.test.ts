/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { getSampleDashboardState } from '../../mocks';
import { saveDashboard } from './save_dashboard';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockShowDashboardSavedToast = vi.fn();

vi.mock('../../dashboard_client', () => {
  const mocked = {
    dashboardClient: {
      create: (dashboardState: DashboardState) => mockCreate(dashboardState),
      update: (id: string, dashboardState: DashboardState) => mockUpdate(id, dashboardState),
    },
  };
  return { ...mocked, default: mocked };
});

vi.mock('./show_dashboard_saved_toast', () => {
  const mocked = {
    showDashboardSavedToast: (params: unknown) => mockShowDashboardSavedToast(params),
  };
  return { ...mocked, default: mocked };
});

describe('Save dashboard state', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should save the dashboard using the same ID', async () => {
    mockUpdate.mockResolvedValue({ id: 'Boogaloo' });
    const dashboardState = {
      ...getSampleDashboardState(),
      title: 'BOO',
    };
    const result = await saveDashboard({
      dashboardState,
      lastSavedId: 'Boogaloo',
      saveOptions: {},
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "id": "Boogaloo",
      }
    `);
    expect(mockUpdate).toHaveBeenCalledWith('Boogaloo', dashboardState);
    expect(mockShowDashboardSavedToast).toHaveBeenCalledWith({
      savedDashboardId: 'Boogaloo',
      dashboardTitle: 'BOO',
    });
  });

  it('should save the dashboard using a new id, and return redirect required', async () => {
    mockCreate.mockResolvedValue({ id: 'newlyGeneratedId' });
    const result = await saveDashboard({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooToo',
      },
      lastSavedId: 'Boogaloonie',
      saveOptions: { saveAsCopy: true },
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "id": "newlyGeneratedId",
        "redirectRequired": true,
      }
    `);
    expect(mockCreate).toHaveBeenCalled();
    expect(mockShowDashboardSavedToast).toHaveBeenCalled();
  });

  it('should return an error when the save fails.', async () => {
    mockCreate.mockRejectedValue('Whoops');
    const result = await saveDashboard({
      dashboardState: {
        ...getSampleDashboardState(),
        title: 'BooThree',
      },
      lastSavedId: 'Boogatoonie',
      saveOptions: { saveAsCopy: true },
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "error": "Whoops",
      }
    `);
  });
});
