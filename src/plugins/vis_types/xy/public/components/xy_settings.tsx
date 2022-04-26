/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import {
  Direction,
  Settings,
  SettingsProps,
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

import { renderEndzoneTooltip } from '@kbn/charts-plugin/public';

import { getThemeService } from '../services';
import { VisConfig } from '../types';

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
  onPointerUpdate: SettingsProps['onPointerUpdate'];
  xDomain?: DomainRange;
  adjustedXDomain?: DomainRange;
  showLegend: boolean;
  onElementClick: ElementClickListener;
  onBrushEnd?: BrushEndListener;
  onRenderChange: RenderChangeListener;
  legendAction?: LegendAction;
  legendColorPicker: LegendColorPicker;
  legendPosition: Position;
  truncateLegend: boolean;
  maxLegendLines: number;
  legendSize?: number;
  ariaLabel?: string;
};

function getValueLabelsStyling() {
  const VALUE_LABELS_MAX_FONTSIZE = 12;
  const VALUE_LABELS_MIN_FONTSIZE = 10;

  return {
    displayValue: {
      fontSize: { min: VALUE_LABELS_MIN_FONTSIZE, max: VALUE_LABELS_MAX_FONTSIZE },
      alignment: { horizontal: HorizontalAlignment.Center, vertical: VerticalAlignment.Middle },
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
  onPointerUpdate,
  onBrushEnd,
  onRenderChange,
  legendAction,
  legendColorPicker,
  legendPosition,
  maxLegendLines,
  truncateLegend,
  legendSize,
  ariaLabel,
}) => {
  const themeService = getThemeService();
  const theme = themeService.useChartsTheme();
  const baseTheme = themeService.useChartsBaseTheme();
  const valueLabelsStyling = getValueLabelsStyling();

  const themeOverrides: PartialTheme = {
    markSizeRatio,
    barSeriesStyle: {
      ...valueLabelsStyling,
    },
    crosshair: {
      ...theme.crosshair,
    },
    legend: {
      labelOptions: { maxLines: truncateLegend ? maxLegendLines ?? 1 : 0 },
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
    ? (value) => xAxis.ticks?.formatter?.(value) ?? ''
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

  const boundary = document.getElementById('app-fixed-viewport') ?? undefined;
  const tooltipProps: TooltipProps = tooltip.detailedTooltip
    ? {
        ...tooltip,
        boundary,
        customTooltip: tooltip.detailedTooltip(headerFormatter),
        headerFormatter: undefined,
      }
    : { ...tooltip, boundary, headerFormatter };

  return (
    <Settings
      debugState={window._echDebugStateFlag ?? false}
      onPointerUpdate={onPointerUpdate}
      xDomain={adjustedXDomain}
      rotation={rotation}
      theme={[themeOverrides, theme]}
      baseTheme={baseTheme}
      showLegend={showLegend}
      legendPosition={legendPosition}
      legendSize={legendSize}
      allowBrushingLastHistogramBin={isTimeChart}
      roundHistogramBrushValues={enableHistogramMode && !isTimeChart}
      legendColorPicker={legendColorPicker}
      onElementClick={onElementClick}
      onBrushEnd={onBrushEnd}
      onRenderChange={onRenderChange}
      legendAction={legendAction}
      tooltip={tooltipProps}
      ariaLabel={ariaLabel}
      ariaUseDefaultSummary={!ariaLabel}
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
