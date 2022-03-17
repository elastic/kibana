/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';

import dateMath from '@elastic/datemath';
import { EuiSuperDatePicker } from '@elastic/eui';

interface CommonlyUsedRange {
  start: string;
  end: string;
  label: string;
}

const commonlyUsedRanges: CommonlyUsedRange[] = [
  {
    start: 'now-30m',
    end: 'now',
    label: 'Last 30 minutes',
  },
  {
    start: 'now-1h',
    end: 'now',
    label: 'Last hour',
  },
  {
    start: 'now-24h',
    end: 'now',
    label: 'Last 24 hours',
  },
  {
    start: 'now-1w',
    end: 'now',
    label: 'Last 7 days',
  },
  {
    start: 'now-30d',
    end: 'now',
    label: 'Last 30 days',
  },
];

interface TimeRange {
  start: string;
  end: string;
  isoStart: string;
  isoEnd: string;
  unixStart: number;
  unixEnd: number;
}

function buildTimeRange(start: string, end: string): TimeRange {
  const timeStart = dateMath.parse(start);
  const timeEnd = dateMath.parse(end);
  return {
    start,
    end,
    isoStart: timeStart.toISOString(),
    isoEnd: timeEnd.toISOString(),
    unixStart: timeStart.utc().unix(),
    unixEnd: timeEnd.utc().unix(),
  };
}

export const FlameGraphNavigation = ({ getter, setter }) => {
  const defaultTimeRange = buildTimeRange(commonlyUsedRanges[0].start, commonlyUsedRanges[0].end);
  const [timeRange, setTimeRange] = useState(defaultTimeRange);

  const handleTimeChange = (selectedTime: { start: string; end: string; isInvalid: boolean }) => {
    if (selectedTime.isInvalid) {
      return;
    }

    const tr = buildTimeRange(selectedTime.start, selectedTime.end);
    setTimeRange(tr);
  };

  useEffect(() => {
    console.log(new Date().toISOString(), timeRange);
    console.log(new Date().toISOString(), 'started payload retrieval');
    getter(timeRange.unixStart, timeRange.unixEnd).then((response) => {
      console.log(new Date().toISOString(), 'finished payload retrieval');
      setter(response);
      console.log(new Date().toISOString(), 'updated local state');
    });
  }, [timeRange]);

  return (
    <div>
      <EuiSuperDatePicker
        start={timeRange.start}
        end={timeRange.end}
        isPaused={true}
        onTimeChange={handleTimeChange}
        commonlyUsedRanges={commonlyUsedRanges}
      />
    </div>
  );
};
