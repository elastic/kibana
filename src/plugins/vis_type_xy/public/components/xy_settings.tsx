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

import React, { FC } from 'react';

import {
  Direction,
  Settings,
  DomainRange,
  Position,
  PartialTheme,
  ElementClickListener,
  BrushEndListener,
  RenderChangeListener,
  LegendAction,
  LegendColorPicker,
  TooltipProps,
  TickFormatter,
  VerticalAlignment,
  HorizontalAlignment,
} from '@elastic/charts';

import { renderEndzoneTooltip } from '../../../charts/public';

import { getThemeService, getUISettings } from '../services';
import { VisConfig } from '../types';
import { fillEmptyValue } from '../utils/get_series_name_fn';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

type XYSettingsProps = Pick<
  VisConfig,
  | 'markSizeRatio'
  | 'rotation'
  | 'enableHistogramMode'
  | 'tooltip'
  | 'isTimeChart'
  | 'xAxis'
  | 'orderBucketsBySum'
> & {
  xDomain?: DomainRange;
  adjustedXDomain?: DomainRange;
  showLegend: boolean;
  onElementClick: ElementClickListener;
  onBrushEnd?: BrushEndListener;
  onRenderChange: RenderChangeListener;
  legendAction?: LegendAction;
  legendColorPicker: LegendColorPicker;
  legendPosition: Position;
};

function getValueLabelsStyling(isHorizontal: boolean) {
  const VALUE_LABELS_MAX_FONTSIZE = 15;
  const VALUE_LABELS_MIN_FONTSIZE = 10;
  const VALUE_LABELS_VERTICAL_OFFSET = -10;
  const VALUE_LABELS_HORIZONTAL_OFFSET = 10;

  return {
    displayValue: {
      fontSize: { min: VALUE_LABELS_MIN_FONTSIZE, max: VALUE_LABELS_MAX_FONTSIZE },
      fill: { textInverted: true, textBorder: 2 },
      alignment: isHorizontal
        ? {
            vertical: VerticalAlignment.Middle,
          }
        : { horizontal: HorizontalAlignment.Center },
      offsetX: isHorizontal ? VALUE_LABELS_HORIZONTAL_OFFSET : 0,
      offsetY: isHorizontal ? 0 : VALUE_LABELS_VERTICAL_OFFSET,
    },
  };
}

export const XYSettings: FC<XYSettingsProps> = ({
  markSizeRatio,
  rotation,
  enableHistogramMode,
  tooltip,
  isTimeChart,
  xAxis,
  orderBucketsBySum,
  xDomain,
  adjustedXDomain,
  showLegend,
  onElementClick,
  onBrushEnd,
  onRenderChange,
  legendAction,
  legendColorPicker,
  legendPosition,
}) => {
  const themeService = getThemeService();
  const theme = themeService.useChartsTheme();
  const baseTheme = themeService.useChartsBaseTheme();
  const dimmingOpacity = getUISettings().get<number | undefined>('visualization:dimmingOpacity');
  const valueLabelsStyling = getValueLabelsStyling(rotation === 90 || rotation === -90);

  const themeOverrides: PartialTheme = {
    markSizeRatio,
    sharedStyle: {
      unhighlighted: {
        opacity: dimmingOpacity,
      },
    },
    barSeriesStyle: {
      ...valueLabelsStyling,
    },
    axes: {
      axisTitle: {
        padding: {
          outer: 10,
        },
      },
    },
    chartMargins:
      legendPosition === Position.Top || legendPosition === Position.Right
        ? {
            bottom: (theme.chartMargins?.bottom ?? 0) + 10,
          }
        : {
            right: (theme.chartMargins?.right ?? 0) + 10,
          },
  };

  const headerValueFormatter: TickFormatter<any> | undefined = xAxis.ticks?.formatter
    ? (value) => fillEmptyValue(xAxis.ticks?.formatter?.(value)) ?? ''
    : undefined;
  const headerFormatter =
    isTimeChart && xDomain && adjustedXDomain
      ? renderEndzoneTooltip(
          xDomain.minInterval,
          'min' in xDomain ? xDomain.min : undefined,
          'max' in xDomain ? xDomain.max : undefined,
          headerValueFormatter,
          !tooltip.detailedTooltip
        )
      : headerValueFormatter &&
        (tooltip.detailedTooltip ? undefined : ({ value }: any) => headerValueFormatter(value));

  const tooltipProps: TooltipProps = tooltip.detailedTooltip
    ? {
        ...tooltip,
        customTooltip: tooltip.detailedTooltip(headerFormatter),
        headerFormatter: undefined,
      }
    : { ...tooltip, headerFormatter };

  return (
    <Settings
      debugState={window._echDebugStateFlag ?? false}
      xDomain={adjustedXDomain}
      rotation={rotation}
      theme={[themeOverrides, theme]}
      baseTheme={baseTheme}
      showLegend={showLegend}
      legendPosition={legendPosition}
      allowBrushingLastHistogramBucket={isTimeChart}
      roundHistogramBrushValues={enableHistogramMode && !isTimeChart}
      legendColorPicker={legendColorPicker}
      onElementClick={onElementClick}
      onBrushEnd={onBrushEnd}
      onRenderChange={onRenderChange}
      legendAction={legendAction}
      tooltip={tooltipProps}
      orderOrdinalBinsBy={
        orderBucketsBySum
          ? {
              direction: Direction.Descending,
            }
          : undefined
      }
    />
  );
};
