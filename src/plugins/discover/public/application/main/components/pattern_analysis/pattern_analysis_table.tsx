/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { type EmbeddablePatternAnalysisInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
import { pick } from 'lodash';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DiscoverStateContainer } from '../../state_management/discover_state';
import { PATTERN_ANALYSIS_LOADED } from './constants';

export type PatternAnalysisTableProps = EmbeddablePatternAnalysisInput & {
  stateContainer?: DiscoverStateContainer;
  trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
  renderViewModeToggle: (patternCount?: number) => React.ReactElement;
};

export const PatternAnalysisTable = (props: PatternAnalysisTableProps) => {
  const [lastReloadRequestTime, setLastReloadRequestTime] = useState<number | undefined>(undefined);

  const services = useDiscoverServices();
  const aiopsService = services.aiops;
  const { trackUiMetric, stateContainer } = props;

  useEffect(() => {
    const refetch = stateContainer?.dataState.refetch$.subscribe(() => {
      setLastReloadRequestTime(Date.now());
    });

    return () => {
      refetch?.unsubscribe();
    };
  }, [stateContainer]);

  useEffect(() => {
    // Track should only be called once when component is loaded
    trackUiMetric?.(METRIC_TYPE.LOADED, PATTERN_ANALYSIS_LOADED);
  }, [trackUiMetric]);

  if (aiopsService === undefined) {
    return null;
  }

  const deps = pick(services, [
    'i18n',
    'theme',
    'data',
    'uiSettings',
    'http',
    'notifications',
    'lens',
    'fieldFormats',
    'application',
    'charts',
    'uiActions',
  ]);

  const input: EmbeddablePatternAnalysisInput = Object.assign(
    {},
    pick(props, ['dataView', 'savedSearch', 'query', 'filters', 'onAddFilter']),
    { lastReloadRequestTime }
  );

  return (
    <aiopsService.PatternAnalysisComponent
      props={{
        input,
        renderViewModeToggle: props.renderViewModeToggle,
      }}
      deps={deps}
      embeddingOrigin="discover"
    />
  );
};
