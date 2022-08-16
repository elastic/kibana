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
  DomainRange,
  PartialTheme,
  Position,
  RectAnnotation,
  RectAnnotationDatum,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { useSelector } from '@xstate/react';
import moment from 'moment';
import React, { useMemo } from 'react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DataAccessService, selectVisibleTimeRange } from '../../state_machines';
import {
  selectHistogramDataPoints,
  selectTimeRange,
} from '../../state_machines/data_access_state_machine';

export function LogExplorerHistogram({
  dataAccessService,
}: {
  dataAccessService: DataAccessService;
}) {
  const styles = useLogExplorerHistogramStyles();
  const { chartBaseTheme, chartThemes } = useLogExplorerHistogramThemes();

  const { timeDomain } = useLogExplorerHistogramDomains(dataAccessService);
  const { countSeries } = useLogExplorerHistogramSeries(dataAccessService);
  const { visibleRangeAnnotation } = useLogExplorerHistogramAnnotations(dataAccessService);

  // TODO: handle state machine states that don't have data
  return (
    <div css={styles.outerWrapper}>
      <EuiPanel css={styles.panel} grow hasBorder hasShadow={false} paddingSize="none">
        <Chart>
          <Settings
            baseTheme={chartBaseTheme}
            rotation={90}
            theme={chartThemes}
            xDomain={timeDomain}
          />
          <Axis hide id="left-time-axis" position={Position.Left} title="time" />
          <AreaSeries
            curve={CurveType.CURVE_STEP_AFTER}
            data={countSeries}
            id="entry-count"
            splitSeriesAccessors={[1]}
            xAccessor={0}
            xScaleType={ScaleType.Time}
            yAccessors={[2]}
            yScaleType={ScaleType.Linear}
          />
          <RectAnnotation dataValues={visibleRangeAnnotation} id="visible-entries-range" />
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
        width: 150,
      },
    }),
    [size.s]
  );
};

const useLogExplorerHistogramDomains = (dataAccessService: DataAccessService) => {
  const timeRange = useSelector(dataAccessService, selectTimeRange);

  const timeDomain = useMemo(
    (): DomainRange => ({
      min: moment.utc(timeRange.from).valueOf(),
      max: moment.utc(timeRange.to).valueOf(),
    }),
    [timeRange.from, timeRange.to]
  );

  return { timeDomain };
};

const useLogExplorerHistogramSeries = (dataAccessService: DataAccessService) => {
  const histogramDataPoints = useSelector(dataAccessService, selectHistogramDataPoints);

  const countSeries = useMemo(
    () =>
      histogramDataPoints.flatMap(({ startTime, countByBreakdownCriterion }) => {
        const startTimestamp = moment.utc(startTime).valueOf();

        return Object.entries(countByBreakdownCriterion).map(
          ([breakdownCriterion, count]) => [startTimestamp, breakdownCriterion, count] as const
        );
      }),
    [histogramDataPoints]
  );

  return {
    countSeries,
  };
};

const useLogExplorerHistogramAnnotations = (dataAccessService: DataAccessService) => {
  const { startTimestamp, endTimestamp } = useSelector(dataAccessService, selectVisibleTimeRange);

  const visibleRangeAnnotation = useMemo((): RectAnnotationDatum[] => {
    if (startTimestamp != null && endTimestamp != null) {
      return [
        {
          coordinates: {
            x0: startTimestamp,
            x1: startTimestamp,
          },
        },
      ];
    } else {
      return [];
    }
  }, [startTimestamp, endTimestamp]);

  return {
    visibleRangeAnnotation,
  };
};
