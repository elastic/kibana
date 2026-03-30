/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useEffect, useMemo } from 'react';
import { Subscription } from 'rxjs';
import type { DataPublicPluginStart, RefreshInterval } from '@kbn/data-plugin/public';
import type { TimeRange } from '@kbn/es-query';

interface UseTimefilterProps {
  disabled?: boolean;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  refreshInterval?: number;
  isRefreshPaused?: boolean;
  timefilter: DataPublicPluginStart['query']['timefilter']['timefilter'];
}

export const useTimefilter = (props: UseTimefilterProps) => {
  const initialTimeRange: TimeRange = getTimeRangeWithFallback(props);
  const initialRefreshInterval: RefreshInterval = getRefreshIntervalWithFallback(props);
  const [timeRange, setTimerange] = useState(initialTimeRange);
  const [refreshInterval, setRefreshInterval] = useState(initialRefreshInterval);

  useEffect(() => {
    if (props.disabled) {
      return;
    }

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
  }, [props.timefilter, props.disabled]);

  const minRefreshInterval = props.timefilter.getMinRefreshInterval();
  const propsTimeRange: TimeRange = useMemo(() => getTimeRangeWithFallback(props, true), [props]);
  const propsRefreshInterval: RefreshInterval = useMemo(
    () => getRefreshIntervalWithFallback(props, true),
    [props]
  );

  if (props.disabled) {
    return {
      refreshInterval: propsRefreshInterval,
      timeRange: propsTimeRange,
      minRefreshInterval,
    };
  }

  return {
    refreshInterval,
    timeRange,
    minRefreshInterval,
  };
};

function getTimeRangeWithFallback(props: UseTimefilterProps, useDefault: boolean = false) {
  const timefilterTime = useDefault
    ? props.timefilter.getTimeDefaults()
    : props.timefilter.getTime();
  return {
    from: props.dateRangeFrom || timefilterTime.from,
    to: props.dateRangeTo || timefilterTime.to,
  };
}

function getRefreshIntervalWithFallback(props: UseTimefilterProps, useDefault: boolean = false) {
  const timefilterRefreshInterval = useDefault
    ? props.timefilter.getRefreshIntervalDefaults()
    : props.timefilter.getRefreshInterval();

  if (useDefault) {
    return {
      value: props.refreshInterval ?? timefilterRefreshInterval.value,
      pause: props.isRefreshPaused ?? timefilterRefreshInterval.pause,
    };
  }

  return {
    value: props.refreshInterval || timefilterRefreshInterval.value,
    pause: props.isRefreshPaused || timefilterRefreshInterval.pause,
  };
}
