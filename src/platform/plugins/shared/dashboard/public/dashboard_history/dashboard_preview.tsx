/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { css } from '@emotion/react';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';

import type { DashboardApi, DashboardInitializationState } from '..';
import { DASHBOARD_APP_ID, DashboardRenderer } from '..';
import { unifiedSearchService } from '../services/kibana_services';

export const DashboardPreview: ChangeHistoryPreviewRenderFn<{
  setPreviewTitle: (title: string) => void;
  inheritedTimeRange?: DashboardState['time_range'];
}> = ({ change, setPreviewTitle, inheritedTimeRange }) => {
  const initialState = useRef<DashboardInitializationState>({
    time_range: inheritedTimeRange,
    ...change,
    viewMode: 'view' as const,
  });
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();

  useEffect(() => {
    if (!dashboardApi) return;
    setPreviewTitle((change.snapshot as DashboardState).title);
    dashboardApi.setState(change.snapshot as DashboardState);
  }, [change, dashboardApi, setPreviewTitle]);

  const memoized = useMemo(() => {
    /** Prevent dashboard renderer from remounting with every history item selection; instead, we will call `setState` on the API */
    return (
      <DashboardRenderer
        getCreationOptions={() =>
          Promise.resolve({
            getInitialInput: () => initialState.current,
          })
        }
        onApiAvailable={setDashboardApi}
      />
    );
  }, []);

  const searchBarVisibilityProps = useMemo(() => {
    return {
      showFilterBar: ((change.snapshot as DashboardState).filters ?? []).length > 0,
      showQueryInput: (change.snapshot as DashboardState).query?.expression !== '',
      showDatePicker: Boolean((change.snapshot as DashboardState).time_range), // if time range is saved, then `time_restore` is true
    };
  }, [change.snapshot]);

  return (
    <div
      css={css`
        overflow: scroll;
      `}
    >
      {Object.values(searchBarVisibilityProps).some((visible) => visible) && (
        <unifiedSearchService.ui.SearchBar
          appName={DASHBOARD_APP_ID}
          filters={toStoredFilters((change.snapshot as DashboardState).filters)}
          disableSubscribingToGlobalDataServices
          isDisabled={true}
          {...searchBarVisibilityProps}
        />
      )}
      {memoized}
    </div>
  );
};
