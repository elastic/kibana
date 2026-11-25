/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TraceMetricsGrid } from '@kbn/unified-chart-section-viewer';
import React, { useCallback, useMemo } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { DataSourceProfileProvider } from '../../../../profiles';
import type { ContextAwarenessToolkitActions } from '../../../../toolkit';
import type { ProfileProviderServices } from '../../../profile_provider_services';
import { useDiscoverServices } from '../../../../../hooks/use_discover_services';
import {
  internalStateActions,
  useAppStateSelector,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../../../../application/main/state_management/redux';
import type { DiscoverAppState } from '../../../../../application/main/state_management/redux';
import { OBSERVABILITY_TRACES_DATA_SOURCE_PROFILE_ID } from '../profile';

/** The flag behind the latency map; the grid reads it too, through the external services. */
const LATENCY_MAP_FLAG = 'observability.tracesLatencyMapEnabled';

const TraceMetricsGridWrapper = (
  props: ChartSectionProps & { actions: ContextAwarenessToolkitActions }
) => {
  const breakdownField = useAppStateSelector((state: DiscoverAppState) => state.breakdownField);
  // The document open in the flyout, so the latency map knows when the one it opened closes.
  const expandedDocId = useCurrentTabSelector((state) => state.expandedDoc?.id);
  const dispatch = useInternalStateDispatch();
  const updateAppState = useCurrentTabAction(internalStateActions.updateAppState);
  const { core } = useDiscoverServices();

  // The latency map sits behind a feature flag the grid reads from the host.
  const externalServices = useMemo(
    () => ({ featureFlags: core.featureFlags }),
    [core.featureFlags]
  );

  const onBreakdownFieldChange = useCallback(
    (nextBreakdownField?: string) => {
      dispatch(updateAppState({ appState: { breakdownField: nextBreakdownField } }));
    },
    [dispatch, updateAppState]
  );

  return (
    <TraceMetricsGrid
      profileId={OBSERVABILITY_TRACES_DATA_SOURCE_PROFILE_ID}
      {...props}
      actions={props.actions}
      breakdownField={breakdownField}
      onBreakdownFieldChange={onBreakdownFieldChange}
      externalServices={externalServices}
      expandedDocId={expandedDocId}
    />
  );
};

export const getChartSectionConfiguration =
  (
    services?: Pick<ProfileProviderServices, 'core'>
  ): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev, { toolkit }) =>
  () => {
    return {
      ...prev(),
      renderChartSection: (props) => {
        return <TraceMetricsGridWrapper {...props} actions={toolkit.actions} />;
      },
      replaceDefaultChart: true,
      // With the latency map, the section sizes to its content under its own key: without
      // one it would read the regular histogram's saved height ('discover:histogramHeight'),
      // sized for a different chart. Without the map, the RED charts keep their settings.
      ...(isLatencyMapEnabled(services)
        ? {
            localStorageKeyPrefix: 'discover:tracesExperience',
            defaultTopPanelHeight: 'max-content',
          }
        : { defaultTopPanelHeight: 300 }),
    };
  };

/**
 * The flag as it stands: the flags service answers through an observable that emits its
 * current value on subscription, and the configuration is read outside React, where its
 * hook cannot be used.
 */
function isLatencyMapEnabled(services?: Pick<ProfileProviderServices, 'core'>): boolean {
  let enabled = false;
  // oxlint-disable-next-line @kbn/eslint/no_feature_flag_snapshot -- read again whenever the chart section mounts, and the flag is a server-wide override (`feature_flags.overrides`) that takes a reload to change anyway
  services?.core.featureFlags
    .getBooleanValue$(LATENCY_MAP_FLAG, false)
    .subscribe((value) => (enabled = value))
    .unsubscribe();
  return enabled;
}
