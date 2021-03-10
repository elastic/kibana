/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useEffect, useMemo, useState } from 'react';

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
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

import { renderEndzoneTooltip } from '../../../charts/public';

import { getIsVisible, getThemeService, getUISettings } from '../services';
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

const KBN_HEADER_OFFSET = parseFloat(euiLightVars.euiHeaderHeightCompensation) * 2;

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
  const [headerOffset, setHeaderOffset] = useState(0);

  useEffect(() => {
    const subscription = getIsVisible().subscribe((value: boolean) => {
      setHeaderOffset(value ? KBN_HEADER_OFFSET : 0);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const boudaryProps = useMemo(() => {
    const boundary = headerOffset ? document.getElementById('app-fixed-viewport') : null;
    return boundary
      ? {
          boundary,
          boundaryPadding: { top: headerOffset },
        }
      : undefined;
  }, [headerOffset]);

  const tooltipProps: TooltipProps = tooltip.detailedTooltip
    ? {
        ...tooltip,
        ...boudaryProps,
        customTooltip: tooltip.detailedTooltip(headerFormatter),
        headerFormatter: undefined,
      }
    : { ...tooltip, ...boudaryProps, headerFormatter };

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
