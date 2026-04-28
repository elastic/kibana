/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '../../server';
import { DEFAULT_DASHBOARD_OPTIONS } from '../../common/constants';
import { sanitizeDashboard } from './sanitize_dashboard';

const mockPost = jest.fn();

jest.mock('../services/kibana_services', () => ({
  coreServices: {
    http: {
      post: (...args: unknown[]) => mockPost(...args),
    },
  },
}));

describe('sanitizeDashboard', () => {
  const baseDashboardState: DashboardState = {
    title: 'My dashboard',
    panels: [],
    pinned_panels: [],
    options: DEFAULT_DASHBOARD_OPTIONS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({ data: baseDashboardState, warnings: [] });
  });

  it('passes through a non-empty title', async () => {
    await sanitizeDashboard({ ...baseDashboardState, title: 'My title' });

    expect(mockPost).toHaveBeenCalledTimes(1);
    const [, { body }] = mockPost.mock.calls[0];
    expect(JSON.parse(body as string)).toEqual({ ...baseDashboardState, title: 'My title' });
  });

  it('sets a placeholder title when title is empty or whitespace', async () => {
    await sanitizeDashboard({ ...baseDashboardState, title: '' });
    {
      const [, { body }] = mockPost.mock.calls[0];
      expect(JSON.parse(body as string)).toEqual({ ...baseDashboardState, title: 'New dashboard' });
    }

    await sanitizeDashboard({ ...baseDashboardState, title: '   ' });
    {
      const [, { body }] = mockPost.mock.calls[1];
      expect(JSON.parse(body as string)).toEqual({ ...baseDashboardState, title: 'New dashboard' });
    }
  });
});
