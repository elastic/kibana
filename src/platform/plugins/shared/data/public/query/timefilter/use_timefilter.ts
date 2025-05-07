/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TimeRange } from '@kbn/es-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Timefilter } from './timefilter';

export interface TimefilterHook {
  timeRange: TimeRange;
  absoluteTimeRange: {
    start: number;
    end: number;
  };
  setTimeRange: React.Dispatch<React.SetStateAction<TimeRange>>;
  refreshAbsoluteTimeRange: () => boolean;
}

export function createUseTimefilterHook(timefilter: Timefilter) {
  return function useTimefilter(): TimefilterHook {
    const [timeRange, setTimeRange] = useState(() => timefilter.getTime());

    const [absoluteTimeRange, setAbsoluteTimeRange] = useState(() => timefilter.getAbsoluteTime());
    const absoluteTimeRangeRef = useRef(absoluteTimeRange);

    useEffect(() => {
      const timeUpdateSubscription = timefilter.getTimeUpdate$().subscribe({
        next: () => {
          setTimeRange(() => timefilter.getTime());
          const newAbsoluteTimeRange = timefilter.getAbsoluteTime();
          absoluteTimeRangeRef.current = newAbsoluteTimeRange;
          setAbsoluteTimeRange(() => timefilter.getAbsoluteTime());
        },
      });

      return () => {
        timeUpdateSubscription.unsubscribe();
      };
    }, []);

    const setTimeRangeMemoized: React.Dispatch<React.SetStateAction<TimeRange>> = useCallback(
      (nextOrCallback) => {
        const val =
          typeof nextOrCallback === 'function'
            ? nextOrCallback(timefilter.getTime())
            : nextOrCallback;

        timefilter.setTime(val);
      },
      []
    );

    const refreshAbsoluteTimeRange = useCallback(() => {
      const newAbsoluteTimeRange = timefilter.getAbsoluteTime();
      if (
        newAbsoluteTimeRange.from !== absoluteTimeRangeRef.current.from ||
        newAbsoluteTimeRange.to !== absoluteTimeRangeRef.current.to
      ) {
        setAbsoluteTimeRange(newAbsoluteTimeRange);
        absoluteTimeRangeRef.current = newAbsoluteTimeRange;
        return true;
      }
      return false;
    }, []);

    const asEpoch = useMemo(() => {
      return {
        start: new Date(absoluteTimeRange.from).getTime(),
        end: new Date(absoluteTimeRange.to).getTime(),
      };
    }, [absoluteTimeRange]);

    return {
      timeRange,
      absoluteTimeRange: asEpoch,
      setTimeRange: setTimeRangeMemoized,
      refreshAbsoluteTimeRange,
    };
  };
}
