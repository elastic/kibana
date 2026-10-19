/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { ShareActionIntents } from '@kbn/share-plugin/public/types';
import { dashboardContextWrapper } from '../../../mocks';
import { shareService } from '../../../services/kibana_services';
import { useDashboardExportItems } from './use_dashboard_export_items';
import { useShareOptions } from './use_share_options';

describe('useDashboardExportItems', () => {
  const badge = { label: 'Experimental', tooltipContent: 'This is experimental.' };

  beforeEach(() => {
    jest
      .mocked(shareService!.availableIntegrations)
      .mockImplementation((_objectType: string, groupId?: string): ShareActionIntents[] =>
        groupId === 'export'
          ? [
              {
                id: 'exportJson',
                shareType: 'integration',
                groupId: 'export',
                config: async () => ({}),
              },
              {
                id: 'pdfReports',
                shareType: 'integration',
                groupId: 'export',
                badge,
                config: async () => ({}),
              },
            ]
          : []
      );
  });

  it('shows the badge of an export integration on its menu item', () => {
    const { result } = renderHook(() => useDashboardExportItems(useShareOptions()), {
      wrapper: dashboardContextWrapper({ savedObjectId: 'test-id' }),
    });

    expect(result.current.find(({ id }) => id === 'pdfReports')).toEqual(
      expect.objectContaining({
        labelBadgeText: 'Experimental',
        tooltipContent: 'This is experimental.',
      })
    );
  });

  it('shows no badge on menu items of export integrations without one', () => {
    const { result } = renderHook(() => useDashboardExportItems(useShareOptions()), {
      wrapper: dashboardContextWrapper({ savedObjectId: 'test-id' }),
    });

    const exportJsonItem = result.current.find(({ id }) => id === 'exportJson');
    expect(exportJsonItem?.labelBadgeText).toBeUndefined();
    expect(exportJsonItem?.tooltipContent).toBeUndefined();
  });
});
