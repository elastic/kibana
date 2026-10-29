/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/common';

import { buildMockDashboardApi } from '../mocks';
import { coreServices, dataService } from '../services/kibana_services';
import { dashboardAppClientApi$ } from '../services/dashboard_app_client_api';
import { getDashboardRecentlyAccessedService } from '../services/dashboard_recently_accessed_service';
import { DashboardRenderer } from './dashboard_renderer';
import { loadDashboardApi } from '../dashboard_api/load_dashboard_api';
import type { DashboardPinnedPanelsState } from '@kbn/as-code-dashboard-schema';

jest.mock('../dashboard_api/load_dashboard_api');

describe('Dashboard Renderer', () => {
  dataService.query.filterManager.getFilters = jest.fn().mockImplementation(() => []);

  (loadDashboardApi as jest.Mock).mockImplementation(async ({ getCreationOptions }) => {
    const { useControlsIntegration } = await (getCreationOptions?.() ?? Promise.resolve({}));
    return {
      useControlsIntegration,
      ...buildMockDashboardApi({
        overrides: {
          pinned_panels: [
            {
              type: 'options_list_control',
            },
          ] as DashboardPinnedPanelsState,
        },
      }),
    };
  });

  it('renders the dashboard control group and dashboard viewport', async () => {
    render(
      <DashboardRenderer
        getCreationOptions={() => Promise.resolve({ useControlsIntegration: true })}
      />
    );

    await waitFor(async () => {
      expect(await screen.queryByTestId('dshDashboardViewport')).toBeInTheDocument();
      expect(await screen.queryByTestId('controls-group-wrapper')).toBeInTheDocument();
    });
  });

  it('renders only the dashboard viewport when useControlsIntegration is false', async () => {
    render(
      <DashboardRenderer
        getCreationOptions={() => Promise.resolve({ useControlsIntegration: false })}
      />
    );

    await waitFor(async () => {
      expect(await screen.queryByTestId('dshDashboardViewport')).toBeInTheDocument();
      expect(await screen.queryByTestId('controls-group-wrapper')).not.toBeInTheDocument();
    });
  });

  it('removes a missing dashboard from recently accessed', async () => {
    (loadDashboardApi as jest.Mock).mockRejectedValueOnce(
      new SavedObjectNotFound({ type: 'dashboard', id: 'missing-id' })
    );

    render(<DashboardRenderer savedObjectId="missing-id" />);

    await waitFor(() => {
      expect(getDashboardRecentlyAccessedService().remove).toHaveBeenCalledWith('missing-id');
      expect(coreServices.chrome.recentlyAccessed.remove).toHaveBeenCalledWith('missing-id');
    });
  });

  describe('publishAsAppClientApi', () => {
    it('publishes the loaded dashboard API until the renderer unmounts', async () => {
      const onApiAvailable = jest.fn();
      const { unmount } = render(
        <DashboardRenderer publishAsAppClientApi onApiAvailable={onApiAvailable} />
      );

      await waitFor(() => expect(onApiAvailable).toHaveBeenCalledTimes(1));
      const [api] = onApiAvailable.mock.calls[0];
      expect(dashboardAppClientApi$.value).toBe(api);

      unmount();
      expect(dashboardAppClientApi$.value).toBeUndefined();
    });

    it('does not publish the dashboard API when not opted in', async () => {
      const onApiAvailable = jest.fn();
      render(<DashboardRenderer onApiAvailable={onApiAvailable} />);

      await waitFor(() => expect(onApiAvailable).toHaveBeenCalledTimes(1));
      expect(dashboardAppClientApi$.value).toBeUndefined();
    });

    it('keeps the published API when an embedded renderer without the prop unmounts', async () => {
      const onPublishedApiAvailable = jest.fn();
      const onEmbeddedApiAvailable = jest.fn();
      const published = render(
        <DashboardRenderer publishAsAppClientApi onApiAvailable={onPublishedApiAvailable} />
      );
      await waitFor(() => expect(onPublishedApiAvailable).toHaveBeenCalledTimes(1));
      const [publishedApi] = onPublishedApiAvailable.mock.calls[0];

      const embedded = render(<DashboardRenderer onApiAvailable={onEmbeddedApiAvailable} />);
      await waitFor(() => expect(onEmbeddedApiAvailable).toHaveBeenCalledTimes(1));
      expect(dashboardAppClientApi$.value).toBe(publishedApi);

      embedded.unmount();
      expect(dashboardAppClientApi$.value).toBe(publishedApi);

      published.unmount();
      expect(dashboardAppClientApi$.value).toBeUndefined();
    });

    it('keeps a newer published API when an older publisher unmounts', async () => {
      const onFirstApiAvailable = jest.fn();
      const onSecondApiAvailable = jest.fn();
      const first = render(
        <DashboardRenderer publishAsAppClientApi onApiAvailable={onFirstApiAvailable} />
      );
      await waitFor(() => expect(onFirstApiAvailable).toHaveBeenCalledTimes(1));
      const second = render(
        <DashboardRenderer publishAsAppClientApi onApiAvailable={onSecondApiAvailable} />
      );
      await waitFor(() => expect(onSecondApiAvailable).toHaveBeenCalledTimes(1));
      const [secondApi] = onSecondApiAvailable.mock.calls[0];

      first.unmount();
      expect(dashboardAppClientApi$.value).toBe(secondApi);

      second.unmount();
      expect(dashboardAppClientApi$.value).toBeUndefined();
    });
  });
});
