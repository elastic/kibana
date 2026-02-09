/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { checkForDuplicateDashboardTitle } from './check_for_duplicate_dashboard_title';
import { extractTitleAndCount } from '../utils/extract_title_and_count';
import type { DashboardSearchRequestBody } from '../../server';

const mockSearchDashboards = jest.fn();
jest.mock('./dashboard_client', () => ({
  dashboardClient: {
    search: (searchBody: DashboardSearchRequestBody) => mockSearchDashboards(searchBody),
  },
}));

describe('checkForDuplicateDashboardTitle', () => {
  const newTitle = 'Shiny dashboard (1)';

  beforeEach(() => {
    mockSearchDashboards.mockReset();
  });

  it('will only search using the dashboard basename', async () => {
    const [baseDashboardName] = extractTitleAndCount(newTitle);
    mockSearchDashboards.mockResolvedValue({
      total: 1,
      dashboards: [
        {
          data: { title: baseDashboardName },
        },
      ],
    });

    await checkForDuplicateDashboardTitle({
      title: newTitle,
      lastSavedTitle: baseDashboardName,
      copyOnSave: true,
      isTitleDuplicateConfirmed: false,
    });

    expect(mockSearchDashboards).toHaveBeenCalledWith({ per_page: 20, search: 'Shiny dashboard' });
  });

  it('invokes onTitleDuplicate with a speculative collision free value when the new title provided is a duplicate match', async () => {
    const [baseDashboardName] = extractTitleAndCount(newTitle);

    const userTitleInput = `${baseDashboardName} (10)`;

    const dashboards = [
      {
        data: {
          title: baseDashboardName,
        },
      },
    ].concat(
      Array.from(new Array(5)).map((_, idx) => ({
        data: {
          title: `${baseDashboardName} (${10 + idx})`,
        },
      }))
    );

    const onTitleDuplicate = jest.fn();

    mockSearchDashboards.mockResolvedValue({
      total: dashboards.length,
      dashboards,
    });

    await checkForDuplicateDashboardTitle({
      title: userTitleInput,
      lastSavedTitle: baseDashboardName,
      copyOnSave: true,
      isTitleDuplicateConfirmed: false,
      onTitleDuplicate,
    });

    expect(mockSearchDashboards).toHaveBeenCalledWith({ per_page: 20, search: 'Shiny dashboard' });

    expect(onTitleDuplicate).toHaveBeenCalledWith(`${baseDashboardName} (15)`);
  });

  it('does not warn about the duplicated title when the casing is different', async () => {
    const baseDashboardName = 'dashboard';
    const dashboardNameUpper = baseDashboardName.toUpperCase();

    mockSearchDashboards.mockResolvedValue({
      total: 1,
      dashboards: [
        {
          data: { title: baseDashboardName },
        },
      ],
    });

    const onTitleDuplicate = jest.fn();

    const result = await checkForDuplicateDashboardTitle({
      title: dashboardNameUpper,
      lastSavedTitle: baseDashboardName,
      copyOnSave: true,
      isTitleDuplicateConfirmed: false,
      onTitleDuplicate,
    });

    expect(result).toBe(true);
    expect(onTitleDuplicate).not.toHaveBeenCalled();
  });
});
