/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { afterFrame } from '@elastic/apm-rum-core';
import { useLocation } from 'react-router-dom';
import { PerformanceApi, PerformanceContext } from './use_performance_context';
import { PerformanceMetricEvent } from '../../performance_metric_events';
import { measureInteraction } from './measure_interaction';
import { DescriptionWithPrefix } from './types';
export type CustomMetrics = Omit<PerformanceMetricEvent, 'eventName' | 'meta' | 'duration'>;

export interface Meta {
  rangeFrom?: string;
  rangeTo?: string;
  description?: DescriptionWithPrefix;
}

export interface EventData {
  customMetrics?: CustomMetrics;
  meta?: Meta;
}

export function PerformanceContextProvider({ children }: { children: React.ReactElement }) {
  const [isRendered, setIsRendered] = useState(false);
  const location = useLocation();

  const interaction = useMemo(() => measureInteraction(location.pathname), [location.pathname]);

  React.useEffect(() => {
    afterFrame(() => {
      setIsRendered(true);
    });
    return () => {
      setIsRendered(false);
      performance.clearMeasures(location.pathname);
    };
  }, [location.pathname]);

  const api = useMemo<PerformanceApi>(
    () => ({
      onPageReady(eventData) {
        if (isRendered) {
          interaction.pageReady(eventData);
        }
      },
      onPageRefreshStart() {
        interaction.pageRefreshStart();
      },
    }),
    [isRendered, interaction]
  );

  return <PerformanceContext.Provider value={api}>{children}</PerformanceContext.Provider>;
}
// dynamic import
// eslint-disable-next-line import/no-default-export
export default PerformanceContextProvider;
