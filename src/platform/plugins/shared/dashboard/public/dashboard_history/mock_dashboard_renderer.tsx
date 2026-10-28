/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';

import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';

import { DEFAULT_DASHBOARD_STATE } from '../../common/default_dashboard_state';
import type { DashboardApi, DashboardInitializationState } from '..';
import { getDashboardApi } from '../dashboard_api/get_dashboard_api';

export const DASHBOARD_APP_ID = 'dashboards';

const MockDashboard = ({ api }: { api: DashboardApi }) => {
  const mountCount = useRef(0);
  useEffect(() => {
    mountCount.current += 1;
  }, []);
  const viewMode = useStateFromPublishingSubject(api.viewMode$);
  const timeRange = useStateFromPublishingSubject(api.timeRange$);
  const layout = useStateFromPublishingSubject(api.layout$);
  return (
    <div data-test-subj="dashboardRenderer" data-mount-count={mountCount.current}>
      <div data-test-subj="viewMode">{viewMode}</div>
      <div data-test-subj="renderedTimeRange">{JSON.stringify(timeRange ?? null)}</div>
      {Object.keys(layout.panels).map((id) => (
        <div key={id} data-test-subj="renderedPanel">
          {id}
        </div>
      ))}
    </div>
  );
};

/**
 * stand-in for `DashboardRenderer` that builds the real dashboard API and renders a summary of its state
 */
export const DashboardRenderer = ({
  getCreationOptions,
  onApiAvailable,
}: {
  getCreationOptions: () => Promise<{ getInitialInput: () => DashboardInitializationState }>;
  onApiAvailable: (api: DashboardApi) => void;
}) => {
  const [api, setApi] = useState<DashboardApi | undefined>();
  useEffect(() => {
    let cancelled = false;
    getCreationOptions().then(({ getInitialInput }) => {
      if (cancelled) return;
      const { viewMode, ...initialState } = getInitialInput();
      const { api: dashboardApi } = getDashboardApi({
        initialState: { ...DEFAULT_DASHBOARD_STATE, ...initialState },
        viewMode,
        incomingEmbeddables: undefined,
      });
      setApi(dashboardApi);
      onApiAvailable(dashboardApi);
    });
    return () => {
      cancelled = true;
    };
  }, [getCreationOptions, onApiAvailable]);
  return api ? <MockDashboard api={api} /> : null;
};
