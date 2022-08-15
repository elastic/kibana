/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  PartialTheme,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import moment from 'moment';
import React, { useMemo } from 'react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DataAccessService } from '../../state_machines';

export interface LogExplorerHistogramDataPoint {
  startTime: string;
  countByBreakdownCriterion: Record<string, number>;
}

export interface LogExplorerHistogramProps {
  stateMachine: DataAccessService;
}

export function LogExplorerHistogram({ stateMachine }: LogExplorerHistogramProps) {
  const styles = useLogExplorerHistogramStyles();
  const { chartBaseTheme, chartThemes } = useLogExplorerHistogramThemes();

  // TODO: fetch data from state machine instead of test data
  const data = useLogExplorerHistogramData();

  // TODO: handle state machine states that don't have data
  return (
    <div css={styles.outerWrapper}>
      <EuiPanel css={styles.panel} grow hasBorder hasShadow={false} paddingSize="none">
        <Chart>
          <Settings rotation={90} theme={chartThemes} baseTheme={chartBaseTheme} />
          <Axis id="left-time-axis" position={Position.Left} title="time" hide />
          <AreaSeries
            id="entry-count"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor={0}
            splitSeriesAccessors={[1]}
            yAccessors={[2]}
            curve={CurveType.CURVE_STEP_AFTER}
            data={data}
          />
        </Chart>
      </EuiPanel>
    </div>
  );
}

const useLogExplorerHistogramThemes = () => {
  const { theme: chartThemeService } = useDiscoverServices();
  const chartTheme = chartThemeService.useChartsTheme();
  const chartBaseTheme = chartThemeService.useChartsBaseTheme();
  const chartThemeOverrides: PartialTheme = useMemo(
    () => ({
      chartMargins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    }),
    []
  );

  const chartThemes = useMemo(
    () => [chartThemeOverrides, chartTheme],
    [chartTheme, chartThemeOverrides]
  );

  return {
    chartThemes,
    chartBaseTheme,
  };
};

const useLogExplorerHistogramStyles = (): Record<string, CSSObject> => {
  const {
    euiTheme: { size },
  } = useEuiTheme();

  return useMemo(
    () => ({
      outerWrapper: {
        padding: `${size.s} ${size.s} ${size.s} 0`,
        flexGrow: 1,
        display: 'flex',
      },
      panel: {
        width: 200,
      },
    }),
    [size.s]
  );
};

const useLogExplorerHistogramData = () =>
  testData.flatMap(({ startTime, countByBreakdownCriterion }) => {
    const startTimestamp = moment.utc(startTime).valueOf();

    return Object.entries(countByBreakdownCriterion).map(
      ([breakdownCriterion, count]) => [startTimestamp, breakdownCriterion, count] as const
    );
  });

const testData: LogExplorerHistogramDataPoint[] = [
  {
    startTime: '2022-08-15T00:00:00.000Z',
    countByBreakdownCriterion: {
      field1: 10,
    },
  },
  {
    startTime: '2022-08-15T01:00:00.000Z',
    countByBreakdownCriterion: {
      field1: 2,
    },
  },
  {
    startTime: '2022-08-15T02:00:00.000Z',
    countByBreakdownCriterion: {
      field1: 5,
    },
  },
  {
    startTime: '2022-08-15T03:00:00.000Z',
    countByBreakdownCriterion: {
      field1: 4,
    },
  },
];
