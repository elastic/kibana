/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import type { IconPosition, YAxisMode, YConfig } from '../../common/types';
import { hasIcon } from './icon';
import type { XYDataLayerConfig, XYAnnotationLayerConfig, XYLayerConfig } from '../../common/types';
import type { FramePublicAPI } from '../types';
import { getAnnotationsLayersConfig } from './visualization';
import { defaultAnnotationColor } from '../../../../../../src/plugins/event_annotation/public';

export const LINES_MARKER_SIZE = 20;

export const computeChartMargins = (
  referenceLinePaddings: Partial<Record<Position, number>>,
  labelVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  titleVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  axesMap: Record<'left' | 'right', unknown>,
  isHorizontal: boolean
) => {
  const result: Partial<Record<Position, number>> = {};
  if (!labelVisibility?.x && !titleVisibility?.x && referenceLinePaddings.bottom) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('bottom') : 'bottom';
    result[placement] = referenceLinePaddings.bottom;
  }
  if (
    referenceLinePaddings.left &&
    (isHorizontal || (!labelVisibility?.yLeft && !titleVisibility?.yLeft))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('left') : 'left';
    result[placement] = referenceLinePaddings.left;
  }
  if (
    referenceLinePaddings.right &&
    (isHorizontal || !axesMap.right || (!labelVisibility?.yRight && !titleVisibility?.yRight))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('right') : 'right';
    result[placement] = referenceLinePaddings.right;
  }
  // there's no top axis, so just check if a margin has been computed
  if (referenceLinePaddings.top) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('top') : 'top';
    result[placement] = referenceLinePaddings.top;
  }
  return result;
};

// Note: it does not take into consideration whether the reference line is in view or not

export const getLinesCausedPaddings = (
  visualConfigs: Array<
    Pick<YConfig, 'axisMode' | 'icon' | 'iconPosition' | 'textVisibility'> | undefined
  >,
  axesMap: Record<'left' | 'right', unknown>
) => {
  // collect all paddings for the 4 axis: if any text is detected double it.
  const paddings: Partial<Record<Position, number>> = {};
  const icons: Partial<Record<Position, number>> = {};
  visualConfigs?.forEach((config) => {
    if (!config) {
      return;
    }
    const { axisMode, icon, iconPosition, textVisibility } = config;
    if (axisMode && (hasIcon(icon) || textVisibility)) {
      const placement = getBaseIconPlacement(iconPosition, axesMap, axisMode);
      paddings[placement] = Math.max(
        paddings[placement] || 0,
        LINES_MARKER_SIZE * (textVisibility ? 2 : 1) // double the padding size if there's text
      );
      icons[placement] = (icons[placement] || 0) + (hasIcon(icon) ? 1 : 0);
    }
  });
  // post-process the padding based on the icon presence:
  // if no icon is present for the placement, just reduce the padding
  (Object.keys(paddings) as Position[]).forEach((placement) => {
    if (!icons[placement]) {
      paddings[placement] = LINES_MARKER_SIZE;
    }
  });
  return paddings;
};

export function mapVerticalToHorizontalPlacement(placement: Position) {
  switch (placement) {
    case Position.Top:
      return Position.Right;
    case Position.Bottom:
      return Position.Left;
    case Position.Left:
      return Position.Bottom;
    case Position.Right:
      return Position.Top;
  }
}

// if there's just one axis, put it on the other one
// otherwise use the same axis
// this function assume the chart is vertical
export function getBaseIconPlacement(
  iconPosition: IconPosition | undefined,
  axesMap?: Record<string, unknown>,
  axisMode?: YAxisMode
) {
  if (iconPosition === 'auto') {
    if (axisMode === 'bottom') {
      return Position.Top;
    }
    if (axesMap) {
      if (axisMode === 'left') {
        return axesMap.right ? Position.Left : Position.Right;
      }
      return axesMap.left ? Position.Right : Position.Left;
    }
  }

  if (iconPosition === 'left') {
    return Position.Left;
  }
  if (iconPosition === 'right') {
    return Position.Right;
  }
  if (iconPosition === 'below') {
    return Position.Bottom;
  }
  return Position.Top;
}

export const isNumericalString = (value: string) => !isNaN(Number(value));

const MAX_DATE = 8640000000000000;
const MIN_DATE = -8640000000000000;

export function getStaticDate(
  dataLayers: XYDataLayerConfig[],
  activeData: FramePublicAPI['activeData']
) {
  const fallbackValue = moment().toISOString();

  const dataLayersId = dataLayers.map(({ layerId }) => layerId);
  if (
    !activeData ||
    Object.entries(activeData)
      .filter(([key]) => dataLayersId.includes(key))
      .every(([, { rows }]) => !rows || !rows.length)
  ) {
    return fallbackValue;
  }

  const minDate = dataLayersId.reduce((acc, lId) => {
    const xAccessor = dataLayers.find((dataLayer) => dataLayer.layerId === lId)?.xAccessor!;
    const firstTimestamp = activeData[lId]?.rows?.[0]?.[xAccessor];
    return firstTimestamp && firstTimestamp < acc ? firstTimestamp : acc;
  }, MAX_DATE);

  const maxDate = dataLayersId.reduce((acc, lId) => {
    const xAccessor = dataLayers.find((dataLayer) => dataLayer.layerId === lId)?.xAccessor!;
    const lastTimestamp = activeData[lId]?.rows?.[activeData?.[lId]?.rows?.length - 1]?.[xAccessor];
    return lastTimestamp && lastTimestamp > acc ? lastTimestamp : acc;
  }, MIN_DATE);
  const middleDate = (minDate + maxDate) / 2;
  return moment(middleDate).toISOString();
}

export const getAnnotationsAccessorColorConfig = (layer: XYAnnotationLayerConfig) => {
  return layer.annotations.map((annotation) => {
    return {
      columnId: annotation.id,
      triggerIcon: annotation.isHidden ? ('invisible' as const) : ('color' as const),
      color: annotation?.color || defaultAnnotationColor,
    };
  });
};

export const getUniqueLabels = (layers: XYLayerConfig[]) => {
  const annotationLayers = getAnnotationsLayersConfig(layers);
  const columnLabelMap = {} as Record<string, string>;
  const counts = {} as Record<string, number>;

  const makeUnique = (label: string) => {
    let uniqueLabel = label;

    while (counts[uniqueLabel] >= 0) {
      const num = ++counts[uniqueLabel];
      uniqueLabel = i18n.translate('xpack.lens.uniqueLabel', {
        defaultMessage: '{label} [{num}]',
        values: { label, num },
      });
    }

    counts[uniqueLabel] = 0;
    return uniqueLabel;
  };

  annotationLayers.forEach((layer) => {
    if (!layer.annotations) {
      return;
    }
    layer.annotations.forEach((l) => {
      columnLabelMap[l.id] = makeUnique(l.label);
    });
  });
  return columnLabelMap;
};
