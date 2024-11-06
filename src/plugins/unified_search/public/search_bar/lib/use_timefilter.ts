/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import type { DataPublicPluginStart, RefreshInterval } from '@kbn/data-plugin/public';
import type { TimeRange } from '@kbn/es-query';

interface UseTimefilterProps {
  dateRangeFrom?: string;
  dateRangeTo?: string;
  refreshInterval?: number;
  isRefreshPaused?: boolean;
  timefilter: DataPublicPluginStart['query']['timefilter']['timefilter'];
}

export const useTimefilter = (props: UseTimefilterProps) => {
  const initialTimeRange: TimeRange = {
    from: props.dateRangeFrom || props.timefilter.getTime().from,
    to: props.dateRangeTo || props.timefilter.getTime().to,
  };
  const initialRefreshInterval: RefreshInterval = {
    value: props.refreshInterval || props.timefilter.getRefreshInterval().value,
    pause: props.isRefreshPaused || props.timefilter.getRefreshInterval().pause,
  };
  const [timeRange, setTimerange] = useState(initialTimeRange);
  const [refreshInterval, setRefreshInterval] = useState(initialRefreshInterval);

  useEffect(() => {
    const subscriptions = new Subscription();

    subscriptions.add(
      props.timefilter.getRefreshIntervalUpdate$().subscribe({
        next: () => {
          const newRefreshInterval = props.timefilter.getRefreshInterval();
          setRefreshInterval(newRefreshInterval);
        },
      })
    );

    subscriptions.add(
      props.timefilter.getTimeUpdate$().subscribe({
        next: () => {
          setTimerange(props.timefilter.getTime());
        },
      })
    );

    return () => {
      subscriptions.unsubscribe();
    };
  }, [props.timefilter]);

  return {
    refreshInterval,
    timeRange,
    minRefreshInterval: props.timefilter.getMinRefreshInterval(),
  };
};
