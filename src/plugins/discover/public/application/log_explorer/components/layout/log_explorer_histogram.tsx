/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Axis,
  BarSeries,
  Chart,
  DomainRange,
  ElementClickListener,
  niceTimeFormatByDay,
  PartialTheme,
  Position,
  ProjectionClickListener,
  RectAnnotation,
  RectAnnotationDatum,
  RectAnnotationStyle,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { useSelector } from '@xstate/react';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import moment from 'moment';
import React, { useCallback, useMemo } from 'react';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { HistogramActorRef, selectVisibleTimeRange } from '../../state_machines';
import { EntriesActorRef, selectTimeRange } from '../../state_machines/entries_state_machine';
import { selectHistogramDataPoints } from '../../state_machines';
import { getPositionFromMsEpoch } from '../../utils/cursor';

export function LogExplorerHistogram({
  histogramService,
  entriesService,
}: {
  histogramService: HistogramActorRef;
  entriesService: EntriesActorRef;
}) {
  const styles = useLogExplorerHistogramStyles();
  const { chartBaseTheme, chartThemes } = useLogExplorerHistogramThemes();

  const { timeDomain } = useLogExplorerHistogramDomains(histogramService);
  const { countSeries } = useLogExplorerHistogramSeries(histogramService);
  const { visibleRangeAnnotation } = useLogExplorerHistogramAnnotations(entriesService);
  const histogramEventHandlers = useLogExplorerHistogramEventHandlers(entriesService);
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
            {...histogramEventHandlers}
          />
          <Axis
            hide
            id="left-time-axis"
            position={Position.Left}
            tickFormat={timeTickFormatter}
            title="time"
          />
          <BarSeries
            data={countSeries}
            id="entry-count"
            splitSeriesAccessors={[1]}
            stackAccessors={[0]}
            xAccessor={0}
            xScaleType={ScaleType.Time}
            yAccessors={[2]}
            yScaleType={ScaleType.Linear}
          />
          <RectAnnotation
            dataValues={visibleRangeAnnotation}
            id="visible-entries-range"
            style={styles.visibleRangeRectAnnotation}
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

const useLogExplorerHistogramStyles = () => {
  const {
    euiTheme: { colors, size },
  } = useEuiTheme();

  return useMemo(
    () => ({
      outerWrapper: {
        padding: `${size.s} ${size.s} ${size.s} 0`,
        flexGrow: 1,
        display: 'flex',
      } as CSSObject,
      panel: {
        width: 150,
      } as CSSObject,
      visibleRangeRectAnnotation: {
        fill: colors.primary,
        stroke: colors.primary,
        strokeWidth: 1,
      } as RectAnnotationStyle,
    }),
    [colors.primary, size.s]
  );
};

const useLogExplorerHistogramDomains = (dataAccessService: HistogramActorRef) => {
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

const useLogExplorerHistogramSeries = (dataAccessService: HistogramActorRef) => {
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

const useLogExplorerHistogramAnnotations = (dataAccessService: EntriesActorRef) => {
  const { startTimestamp, endTimestamp } = useSelector(dataAccessService, selectVisibleTimeRange);

  const visibleRangeAnnotation = useMemo((): RectAnnotationDatum[] => {
    if (startTimestamp != null && endTimestamp != null) {
      return [
        {
          coordinates: {
            x0: moment.utc(startTimestamp).valueOf(),
            x1: moment.utc(endTimestamp).valueOf(),
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

const useLogExplorerHistogramEventHandlers = (dataAccessService: EntriesActorRef) => {
  const onProjectionClick = useCallback<ProjectionClickListener>(
    ({ x }) => {
      if (typeof x === 'number') {
        dataAccessService.send({
          type: 'positionChanged',
          position: getPositionFromMsEpoch(x),
        });
      }
    },
    [dataAccessService]
  );

  const onElementClick = useCallback<ElementClickListener>(
    ([elementClickEvent]) => {
      const clickedTimestamp = pipe(
        numericXYEvent.decode(elementClickEvent),
        fold(
          () => undefined,
          ([{ x }]) => x
        )
      );

      if (clickedTimestamp != null) {
        dataAccessService.send({
          type: 'positionChanged',
          position: getPositionFromMsEpoch(clickedTimestamp),
        });
      }
    },
    [dataAccessService]
  );

  return {
    onProjectionClick,
    onElementClick,
  };
};

const timeTickFormatter = timeFormatter(niceTimeFormatByDay(1));

const numericXYEvent = rt.tuple([
  rt.type({
    x: rt.number,
    y: rt.number,
  }),
  rt.type({}),
]);
