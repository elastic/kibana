/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveLinkInfo } from './resolve_links';
import { Link, DASHBOARD_LINK_TYPE } from '../../common/content_management';

jest.mock('../components/dashboard_link/dashboard_link_tools', () => ({
  fetchDashboard: async (id: string) => {
    if (id === '404') {
      const error = new Error('Dashboard not found');
      throw error;
    }
    return {
      attributes: {
        title: `Dashboard ${id}`,
        description: 'Some descriptive text.',
      },
    };
  },
}));

describe('resolveLinkInfo', () => {
  it('resolves a dashboard link with no label', async () => {
    const link: Link = {
      id: '1',
      type: DASHBOARD_LINK_TYPE,
      order: 0,
      destination: '001',
    };
    const resolvedLink = await resolveLinkInfo(link);
    expect(resolvedLink).toEqual({
      title: 'Dashboard 001',
      description: 'Some descriptive text.',
      label: undefined,
    });
  });

  it('resolves a dashboard link with a label', async () => {
    const link: Link = {
      id: '1',
      type: DASHBOARD_LINK_TYPE,
      order: 0,
      destination: '001',
      label: 'My Dashboard',
    };
    const resolvedLink = await resolveLinkInfo(link);
    expect(resolvedLink).toEqual({
      title: 'Dashboard 001',
      description: 'Some descriptive text.',
      label: 'My Dashboard',
    });
  });

  it('adds an error for missing dashboard', async () => {
    const link: Link = {
      id: '1',
      type: DASHBOARD_LINK_TYPE,
      order: 0,
      destination: '404',
    };
    const resolvedLink = await resolveLinkInfo(link);
    expect(resolvedLink).toEqual({
      title: 'Error fetching dashboard',
      description: 'Dashboard not found',
      error: new Error('Dashboard not found'),
    });
  });
});
