/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UnifiedHistogramApi, UseUnifiedHistogramProps } from '@kbn/unified-histogram';

export type DiscoverUnifiedHistogramProps = UseUnifiedHistogramProps & {
  setUnifiedHistogramApi: (api: UnifiedHistogramApi) => void;
};

export const getHistogramProps = ({
  setUnifiedHistogramApi,
  ...props
}: DiscoverUnifiedHistogramProps): UseUnifiedHistogramProps => {
  void setUnifiedHistogramApi;
  return props;
};

export const withoutRouteCallbacks = (
  props: UseUnifiedHistogramProps
): UseUnifiedHistogramProps => ({
  ...props,
  disabledActions: undefined,
  isChartLoading: false,
  onBreakdownFieldChange: undefined,
  onBrushEnd: undefined,
  onFilter: undefined,
  onTimeIntervalChange: undefined,
  onVisContextChanged: undefined,
  withDefaultActions: false,
});

export const withCurrentRouteCallbacks = (
  cachedProps: UseUnifiedHistogramProps,
  routeProps: UseUnifiedHistogramProps
): UseUnifiedHistogramProps => ({
  ...cachedProps,
  disabledActions: routeProps.disabledActions,
  isChartLoading: routeProps.isChartLoading,
  onBreakdownFieldChange: routeProps.onBreakdownFieldChange,
  onBrushEnd: routeProps.onBrushEnd,
  onFilter: routeProps.onFilter,
  onTimeIntervalChange: routeProps.onTimeIntervalChange,
  onVisContextChanged: routeProps.onVisContextChanged,
  withDefaultActions: routeProps.withDefaultActions,
});
