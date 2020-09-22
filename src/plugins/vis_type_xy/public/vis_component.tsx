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

import React, { memo, useCallback, useMemo, useState } from 'react';
import _ from 'lodash';

import {
  Chart,
  ElementClickListener,
  XYChartElementEvent,
  Position,
  XYChartSeriesIdentifier,
  BrushEndListener,
} from '@elastic/charts';

import { ExprVis } from '../../visualizations/public';
import {
  getFilterFromChartClickEventFn,
  getFilterFromSeriesFn,
  LegendToggle,
  getBrushFromChartBrushEventFn,
} from '../../charts/public';
import { KibanaDatatable } from '../../expressions/public';

import { VisParams } from './types';
import {
  getAdjustedDomain,
  getXDomain,
  getTimeZone,
  renderAllSeries,
  getSeriesNameFn,
  getLegendActions,
  getColorPicker,
} from './utils';
import {
  XYAxis,
  XYEndzones,
  XYCurrentTime,
  XYSettings,
  XYThresholdLine,
  SplitChartWarning,
} from './components';
import { getConfig } from './config';
import { getThemeService, getColorsService, getDataActions } from './services';

import './_chart.scss';
import { ValueClickContext } from '../../embeddable/public';

export interface VisComponentProps {
  visParams: VisParams;
  visData: KibanaDatatable;
  vis: ExprVis;
  renderComplete: () => void;
}

export const VisComponent = memo((props: VisComponentProps) => {
  /**
   * Stores all series labels to replicate vislib color map lookup
   */
  const allSeries: Array<string | number> = [];
  const [showLegend, setShowLegend] = useState<boolean>(() => {
    // TODO: Check when this bwc can safely be removed
    const bwcLegendStateDefault =
      props.visParams.addLegend == null ? true : props.visParams.addLegend;
    return props.vis.getUiState().get('vis.legendOpen', bwcLegendStateDefault) as boolean;
  });

  const handleFilterClick = useCallback(
    (visData: KibanaDatatable, xAccessor: string | number | null): ElementClickListener => (
      elements
    ) => {
      if (xAccessor !== null) {
        const filterEvent = getFilterFromChartClickEventFn(
          visData,
          xAccessor
        )(elements as XYChartElementEvent[]);
        props.vis.API.events.filter(filterEvent);
      }
    },
    [props.vis]
  );

  const handleBrush = useCallback(
    (visData: KibanaDatatable, xAccessor: string | number | null): BrushEndListener => (
      brushArea
    ) => {
      if (xAccessor !== null) {
        const brushEvent = getBrushFromChartBrushEventFn(visData, xAccessor)(brushArea);
        props.vis.API.events.brush(brushEvent);
      }
    },
    [props.vis]
  );

  const getFilterEventData = useCallback(
    (visData: KibanaDatatable, xAccessor: string | number | null) => (
      series: XYChartSeriesIdentifier
    ): ValueClickContext['data']['data'] => {
      if (xAccessor !== null) {
        return getFilterFromSeriesFn(visData)(series).data;
      }

      return [];
    },
    []
  );

  const handleFilterAction = useCallback(
    (data: ValueClickContext['data']['data'], negate = false) => {
      props.vis.API.events.filter({ data, negate });
    },
    [props.vis.API.events]
  );

  const canFilter = async (data: ValueClickContext['data']['data']): Promise<boolean> => {
    const filters = await getDataActions().createFiltersFromValueClickAction({ data });
    return Boolean(filters.length);
  };

  const toggleLegend = useCallback(() => {
    setShowLegend((value) => {
      const newValue = !value;
      props.vis.getUiState().set('vis.legendOpen', newValue);
      return newValue;
    });
  }, [props.vis]);

  const setColor = useCallback(
    (newColor: string, seriesLabel: string | number) => {
      const colors = props.vis.getUiState().get('vis.colors') || {};
      if (colors[seriesLabel] === newColor) {
        delete colors[seriesLabel];
      } else {
        colors[seriesLabel] = newColor;
      }
      props.vis.getUiState().setSilent('vis.colors', null);
      props.vis.getUiState().set('vis.colors', colors);
      props.vis.getUiState().emit('colorChanged');
    },
    [props.vis]
  );

  const { visData, visParams } = props;
  const config = getConfig(visData as any, visParams);
  const timeZone = getTimeZone();
  const xDomain = getXDomain(config.aspects.x.params);
  const adjustedXDomain = getAdjustedDomain(visData.rows, config.aspects.x, timeZone, xDomain);
  const legendPosition = useMemo(() => config.legend.position ?? Position.Right, [
    config.legend.position,
  ]);
  const isDarkMode = getThemeService().useDarkMode();
  const getSeriesName = getSeriesNameFn(config.aspects, config.aspects.y.length > 1);

  const getSeriesColor = useCallback(
    (series: XYChartSeriesIdentifier) => {
      const seriesName = getSeriesName(series);
      if (!seriesName) {
        return;
      }

      const overwriteColors: Record<string, string> = props.vis.getUiState().get('vis.colors', {});

      if (props.visParams.isVislibVis) {
        allSeries.push(seriesName);
        return getColorsService().createColorLookupFunction(allSeries, overwriteColors)(seriesName);
      }

      return overwriteColors[seriesName];
    },
    [allSeries, getSeriesName, props.vis, props.visParams.isVislibVis]
  );

  if (visParams.dimensions.splitRow || visParams.dimensions.splitRow) {
    // TODO: Replace with small multiples implementation
    // https://github.com/elastic/elastic-charts/issues/735
    return <SplitChartWarning />;
  }

  return (
    <div className="xyChart__container">
      <LegendToggle
        onClick={toggleLegend}
        showLegend={showLegend}
        legendPosition={legendPosition}
      />
      <Chart size="100%">
        <XYSettings
          {...config}
          showLegend={showLegend}
          legendPosition={legendPosition}
          xDomain={xDomain}
          adjustedXDomain={adjustedXDomain}
          legendColorPicker={getColorPicker(legendPosition, setColor, getSeriesName)}
          onElementClick={handleFilterClick(visData, config.aspects.x.accessor)}
          onBrushEnd={handleBrush(visData, config.aspects.x.accessor)}
          legendAction={
            config.aspects.series && (config.aspects.series?.length ?? 0) > 0
              ? getLegendActions(
                  canFilter,
                  getFilterEventData(visData, config.aspects.x.accessor),
                  handleFilterAction,
                  getSeriesName
                )
              : undefined
          }
        />
        <XYThresholdLine {...config.thresholdLine} />
        <XYCurrentTime enabled={config.showCurrentTime} isDarkMode={isDarkMode} domain={xDomain} />
        <XYEndzones
          enabled={config.isTimeChart}
          // TODO: remove after https://github.com/elastic/elastic-charts/issues/798
          groupId={config.yAxes[0]?.groupId}
          isDarkMode={isDarkMode}
          domain={xDomain}
          hideTooltips={!config.detailedTooltip}
          adjustedDomain={adjustedXDomain}
        />
        <XYAxis {...config.xAxis} />
        {config.yAxes.map((axisProps) => (
          <XYAxis key={axisProps.id} {...axisProps} />
        ))}
        {renderAllSeries(
          config,
          visParams.seriesParams,
          visData.rows,
          getSeriesName,
          getSeriesColor,
          timeZone
        )}
      </Chart>
    </div>
  );
});
