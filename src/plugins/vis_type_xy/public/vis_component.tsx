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

import React, {
  BaseSyntheticEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  Chart,
  ElementClickListener,
  XYChartElementEvent,
  Position,
  XYChartSeriesIdentifier,
  BrushEndListener,
  RenderChangeListener,
  ScaleType,
} from '@elastic/charts';
import { keys } from '@elastic/eui';

import {
  getFilterFromChartClickEventFn,
  getFilterFromSeriesFn,
  LegendToggle,
  getBrushFromChartBrushEventFn,
  ClickTriggerEvent,
} from '../../charts/public';
import { Datatable, IInterpreterRenderHandlers } from '../../expressions/public';

import { Aspect, VisParams } from './types';
import {
  getAdjustedDomain,
  getXDomain,
  getTimeZone,
  renderAllSeries,
  getSeriesNameFn,
  getLegendActions,
  getColorPicker,
} from './utils';
import { XYAxis, XYEndzones, XYCurrentTime, XYSettings, XYThresholdLine } from './components';
import { getConfig } from './config';
import { getThemeService, getColorsService, getDataActions } from './services';
import { ChartType } from '../common';

import './_chart.scss';

export interface VisComponentProps {
  visParams: VisParams;
  visData: Datatable;
  uiState: IInterpreterRenderHandlers['uiState'];
  fireEvent: IInterpreterRenderHandlers['event'];
  renderComplete: IInterpreterRenderHandlers['done'];
}

export type VisComponentType = typeof VisComponent;

const VisComponent = (props: VisComponentProps) => {
  /**
   * Stores all series labels to replicate vislib color map lookup
   */
  const allSeries: Array<string | number> = useMemo(() => [], []);
  const [showLegend, setShowLegend] = useState<boolean>(() => {
    // TODO: Check when this bwc can safely be removed
    const bwcLegendStateDefault =
      props.visParams.addLegend == null ? true : props.visParams.addLegend;
    return props.uiState?.get('vis.legendOpen', bwcLegendStateDefault) as boolean;
  });

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        props.renderComplete();
      }
    },
    [props]
  );

  const handleFilterClick = useCallback(
    (visData: Datatable, xAccessor: string | number | null): ElementClickListener => (elements) => {
      if (xAccessor !== null) {
        const event = getFilterFromChartClickEventFn(
          visData,
          xAccessor
        )(elements as XYChartElementEvent[]);
        props.fireEvent(event);
      }
    },
    [props]
  );

  const handleBrush = useCallback(
    (visData: Datatable, { accessor, params }: Aspect): BrushEndListener | undefined => {
      if (accessor !== null && 'interval' in params) {
        return (brushArea) => {
          const event = getBrushFromChartBrushEventFn(visData, accessor)(brushArea);
          props.fireEvent(event);
        };
      }
    },
    [props]
  );

  const getFilterEventData = useCallback(
    (visData: Datatable, xAccessor: string | number | null) => (
      series: XYChartSeriesIdentifier
    ): ClickTriggerEvent | null => {
      if (xAccessor !== null) {
        return getFilterFromSeriesFn(visData)(series);
      }

      return null;
    },
    []
  );

  const handleFilterAction = useCallback(
    (event: ClickTriggerEvent, negate = false) => {
      props.fireEvent({
        ...event,
        data: {
          ...event.data,
          negate,
        },
      });
    },
    [props]
  );

  const canFilter = async (event: ClickTriggerEvent | null): Promise<boolean> => {
    if (!event) {
      return false;
    }
    const filters = await getDataActions().createFiltersFromValueClickAction(event.data);
    return Boolean(filters.length);
  };

  const toggleLegend = useCallback(() => {
    setShowLegend((value) => {
      const newValue = !value;
      if (props.uiState?.set) {
        props.uiState.set('vis.legendOpen', newValue);
      }
      return newValue;
    });
  }, [props.uiState]);

  const setColor = useCallback(
    (newColor: string | null, seriesLabel: string | number, event: BaseSyntheticEvent) => {
      if ((event as KeyboardEvent).key && (event as KeyboardEvent).key !== keys.ENTER) {
        return;
      }

      const colors = props.uiState?.get('vis.colors') || {};
      if (colors[seriesLabel] === newColor || !newColor) {
        delete colors[seriesLabel];
      } else {
        colors[seriesLabel] = newColor;
      }

      if (props.uiState?.set) {
        props.uiState.setSilent('vis.colors', null);
        props.uiState.set('vis.colors', colors);
        props.uiState.emit('colorChanged');
      }
    },
    [props.uiState]
  );

  const { visData, visParams } = props;
  const config = getConfig(visData, visParams);
  const timeZone = getTimeZone();
  const xDomain =
    config.xAxis.scale.type === ScaleType.Ordinal ? undefined : getXDomain(config.aspects.x.params);
  const hasBars = visParams.seriesParams.some(
    ({ type, data: { id: paramId } }) =>
      type === ChartType.Histogram &&
      config.aspects.y.find(({ aggId }) => aggId === paramId) !== undefined
  );
  const adjustedXDomain =
    config.xAxis.scale.type === ScaleType.Ordinal
      ? undefined
      : getAdjustedDomain(visData.rows, config.aspects.x, timeZone, xDomain, hasBars);
  const legendPosition = useMemo(() => config.legend.position ?? Position.Right, [
    config.legend.position,
  ]);
  const isDarkMode = getThemeService().useDarkMode();
  const getSeriesName = getSeriesNameFn(config.aspects, config.aspects.y.length > 1);
  const nonStackedBars = visParams.seriesParams.filter(
    ({ type, data: { id: paramId }, valueAxis: groupId, mode }) => {
      const barAspect =
        type === ChartType.Histogram && config.aspects.y.find(({ aggId }) => aggId === paramId);

      if (!barAspect) {
        return false;
      }

      const yAxisScale = config.yAxes.find(({ groupId: axisGroupId }) => axisGroupId === groupId)
        ?.scale;
      return !(mode === 'stacked' || yAxisScale?.mode === 'percentage');
    }
  );
  const hasNonStackedBars = nonStackedBars.length > 1;

  const getSeriesColor = useCallback(
    (series: XYChartSeriesIdentifier) => {
      const seriesName = getSeriesName(series);
      if (!seriesName) {
        return;
      }

      const overwriteColors: Record<string, string> = props.uiState?.get
        ? props.uiState.get('vis.colors', {})
        : {};

      allSeries.push(seriesName);
      return getColorsService().createColorLookupFunction(allSeries, overwriteColors)(seriesName);
    },
    [allSeries, getSeriesName, props.uiState]
  );

  return (
    <div className="xyChart__container" data-test-subj="visTypeXyChart">
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
          onBrushEnd={handleBrush(visData, config.aspects.x)}
          onRenderChange={onRenderChange}
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
          isFullBin={hasNonStackedBars}
          enabled={config.isTimeChart}
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
          timeZone,
          hasNonStackedBars
        )}
      </Chart>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default memo(VisComponent);
