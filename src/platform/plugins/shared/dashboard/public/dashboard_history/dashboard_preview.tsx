/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { ChangeHistoryPreviewRenderFn } from '@kbn/change-history-ui';
import { i18n } from '@kbn/i18n';

import type { DashboardApi, DashboardInitializationState } from '..';
import { DASHBOARD_APP_ID, DashboardRenderer } from '..';
import { unifiedSearchService } from '../services/kibana_services';

/** prevent dashboard renderer from remounting with every history item selection; instead, we will call `setState` on the API */
const PreviewRenderer = React.memo(
  ({
    initialState,
    onApiAvailable,
  }: {
    initialState: DashboardInitializationState;
    onApiAvailable: (api: DashboardApi) => void;
  }) => (
    <DashboardRenderer
      getCreationOptions={() =>
        Promise.resolve({
          getInitialInput: () => ({ ...initialState, viewMode: 'non-interactive' }),
        })
      }
      onApiAvailable={onApiAvailable}
    />
  )
);

/** `setState` leaves the previous time range in place when the snapshot has none, so fall back to the inherited one */
const withInheritedTimeRange = (
  snapshot: DashboardState,
  inheritedTimeRange: DashboardState['time_range']
): DashboardState =>
  snapshot.time_range ? snapshot : { ...snapshot, time_range: inheritedTimeRange };

export const DashboardPreview: ChangeHistoryPreviewRenderFn<{
  setPreviewTitle: (title: string) => void;
  inheritedTimeRange?: DashboardState['time_range'];
}> = ({ change, setPreviewTitle, inheritedTimeRange }) => {
  const initialState = useRef<DashboardInitializationState>({
    ...withInheritedTimeRange(change.snapshot as DashboardState, inheritedTimeRange),
  });
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>();

  const applyQueue = useRef<Promise<void>>(Promise.resolve());
  /** the selection whose snapshot could not be applied; the preview would not match this version */
  const [failedChange, setFailedChange] = useState<typeof change | undefined>();

  useEffect(() => {
    if (!dashboardApi) return;
    setPreviewTitle((change.snapshot as DashboardState).title);
    const state = withInheritedTimeRange(change.snapshot as DashboardState, inheritedTimeRange);
    /** `setState` awaits async child state application, so wait for the previous call to avoid overlapping; skip snapshots that were superseded while queued */
    let isStale = false;
    setFailedChange(undefined);
    applyQueue.current = applyQueue.current
      .then(() => (isStale ? undefined : dashboardApi.setState(state)))
      .catch(() => {
        // recover the queue so later snapshots still apply, but surface the failure for this selection
        if (!isStale) setFailedChange(change);
      });
    return () => {
      isStale = true;
    };
  }, [change, dashboardApi, inheritedTimeRange, setPreviewTitle]);

  const timeRange = (change.snapshot as DashboardState).time_range ?? inheritedTimeRange;
  const searchBarVisibilityProps = useMemo(() => {
    return {
      showFilterBar: ((change.snapshot as DashboardState).filters ?? []).length > 0,
      showQueryInput: (change.snapshot as DashboardState).query?.expression !== '',
      showDatePicker: Boolean((change.snapshot as DashboardState).time_range), // if time range is saved, then `time_restore` is true
    };
  }, [change.snapshot]);

  const hasApplyError = failedChange === change;

  return hasApplyError ? (
    <EuiEmptyPrompt
      color="danger"
      iconType="warning"
      data-test-subj="dashboardPreviewApplyError"
      title={
        <h2>
          {i18n.translate('dashboard.changeHistory.previewApplyErrorTitle', {
            defaultMessage: 'Unable to load this version',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('dashboard.changeHistory.previewApplyErrorBody', {
            defaultMessage:
              'This version of the dashboard could not be displayed. Select a different version, or go back to the dashboard.',
          })}
        </p>
      }
    />
  ) : (
    <>
      {Object.values(searchBarVisibilityProps).some((visible) => visible) && (
        <unifiedSearchService.ui.SearchBar
          appName={DASHBOARD_APP_ID}
          filters={toStoredFilters((change.snapshot as DashboardState).filters)}
          query={toStoredQuery((change.snapshot as DashboardState).query)}
          dateRangeFrom={timeRange?.from}
          dateRangeTo={timeRange?.to}
          {...searchBarVisibilityProps}
          disableSubscribingToGlobalDataServices
        />
      )}
      <PreviewRenderer initialState={initialState.current} onApiAvailable={setDashboardApi} />
    </>
  );
};
