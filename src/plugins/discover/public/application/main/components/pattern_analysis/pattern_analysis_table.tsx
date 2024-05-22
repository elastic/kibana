/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { type EmbeddablePatternAnalysisInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
import { pick } from 'lodash';
import type { LogCategorizationEmbeddableProps } from '@kbn/aiops-plugin/public/components/log_categorization/log_categorization_for_embeddable/log_categorization_for_embeddable';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
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
    if (aiopsService) {
      trackUiMetric?.(METRIC_TYPE.LOADED, PATTERN_ANALYSIS_LOADED);
    }
  }, [aiopsService, trackUiMetric]);

  const patternAnalysisComponentProps: LogCategorizationEmbeddableProps = useMemo(
    () => ({
      input: Object.assign(
        {},
        pick(props, ['dataView', 'savedSearch', 'query', 'filters', 'switchToDocumentView']),
        { lastReloadRequestTime }
      ),
      renderViewModeToggle: props.renderViewModeToggle,
    }),
    [lastReloadRequestTime, props]
  );

  if (!aiopsService) {
    return null;
  }

  return (
    <aiopsService.PatternAnalysisComponent
      props={patternAnalysisComponentProps}
      deps={services}
      embeddingOrigin="discover"
    />
  );
};
