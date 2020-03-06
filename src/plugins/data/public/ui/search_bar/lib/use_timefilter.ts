/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import { DataPublicPluginStart, TimeRange, RefreshInterval } from 'src/plugins/data/public';

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
  };
};
