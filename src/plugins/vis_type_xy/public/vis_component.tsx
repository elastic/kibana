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
  useEffect,
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
  AccessorFn,
  Accessor,
} from '@elastic/charts';
import { keys } from '@elastic/eui';

import { compact } from 'lodash';
import {
  getFilterFromChartClickEventFn,
  getFilterFromSeriesFn,
  LegendToggle,
  getBrushFromChartBrushEventFn,
  ClickTriggerEvent,
} from '../../charts/public';
import { Datatable, IInterpreterRenderHandlers } from '../../expressions/public';

import { VisParams } from './types';
import {
  getAdjustedDomain,
  getXDomain,
  getTimeZone,
  renderAllSeries,
  getSeriesNameFn,
  getLegendActions,
  useColorPicker,
  getXAccessor,
} from './utils';
import { XYAxis, XYEndzones, XYCurrentTime, XYSettings, XYThresholdLine } from './components';
import { getConfig } from './config';
import { getThemeService, getColorsService, getDataActions } from './services';
import { ChartType } from '../common';

import './_chart.scss';
import {
  COMPLEX_SPLIT_ACCESSOR,
  getComplexAccessor,
  getSplitSeriesAccessorFnMap,
} from './utils/accessors';

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

  useEffect(() => {
    const fn = () => {
      props?.uiState?.emit?.('reload');
    };
    props?.uiState?.on?.('change', fn);

    return () => {
      props?.uiState?.off?.('change', fn);
    };
  }, [props?.uiState]);

  const onRenderChange = useCallback<RenderChangeListener>(
    (isRendered) => {
      if (isRendered) {
        props.renderComplete();
      }
    },
    [props]
  );

  const handleFilterClick = useCallback(
    (
      visData: Datatable,
      xAccessor: Accessor | AccessorFn,
      splitSeriesAccessors: Array<Accessor | AccessorFn>
    ): ElementClickListener => {
      const splitSeriesAccessorFnMap = getSplitSeriesAccessorFnMap(splitSeriesAccessors);
      return (elements) => {
        if (xAccessor !== null) {
          const event = getFilterFromChartClickEventFn(
            visData,
            xAccessor,
            splitSeriesAccessorFnMap
          )(elements as XYChartElementEvent[]);
          props.fireEvent(event);
        }
      };
    },
    [props]
  );

  const handleBrush = useCallback(
    (
      visData: Datatable,
      xAccessor: Accessor | AccessorFn,
      isInterval: boolean
    ): BrushEndListener | undefined => {
      if (xAccessor !== null && isInterval) {
        return (brushArea) => {
          const event = getBrushFromChartBrushEventFn(visData, xAccessor)(brushArea);
          props.fireEvent(event);
        };
      }
    },
    [props]
  );

  const getFilterEventData = useCallback(
    (
      visData: Datatable,
      xAccessor: Accessor | AccessorFn,
      splitSeriesAccessors: Array<Accessor | AccessorFn>
    ) => {
      const splitSeriesAccessorFnMap = getSplitSeriesAccessorFnMap(splitSeriesAccessors);
      return (series: XYChartSeriesIdentifier): ClickTriggerEvent | null => {
        if (xAccessor !== null) {
          return getFilterFromSeriesFn(visData)(series, splitSeriesAccessorFnMap);
        }

        return null;
      };
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
  const xAccessor = getXAccessor(config.aspects.x);
  const splitSeriesAccessors = config.aspects.series
    ? compact(config.aspects.series.map(getComplexAccessor(COMPLEX_SPLIT_ACCESSOR)))
    : [];

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
          legendColorPicker={useColorPicker(legendPosition, setColor, getSeriesName)}
          onElementClick={handleFilterClick(visData, xAccessor, splitSeriesAccessors)}
          onBrushEnd={handleBrush(visData, xAccessor, 'interval' in config.aspects.x.params)}
          onRenderChange={onRenderChange}
          legendAction={
            config.aspects.series && (config.aspects.series?.length ?? 0) > 0
              ? getLegendActions(
                  canFilter,
                  getFilterEventData(visData, xAccessor, splitSeriesAccessors),
                  handleFilterAction,
                  getSeriesName
                )
              : undefined
          }
        />
        <XYThresholdLine {...config.thresholdLine} />
        <XYCurrentTime enabled={config.showCurrentTime} isDarkMode={isDarkMode} domain={xDomain} />
        <XYEndzones
          isFullBin={!config.enableHistogramMode}
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
          xAccessor,
          splitSeriesAccessors
        )}
      </Chart>
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default memo(VisComponent);
