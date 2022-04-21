/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { XyVisFn } from '../types';
import { XY_VIS, DATA_LAYER, REFERENCE_LINE_LAYER, ANNOTATION_LAYER } from '../constants';
import { strings } from '../i18n';
import { commonXYArgs } from './common_xy_args';

const validateExtents = (dataLayers: DataLayerConfigResult[], axes?: YAxisConfigResult[]) => {
  const lineSeries = dataLayers.filter(({ seriesType }) => seriesType === SeriesTypes.LINE);
  const hasBarOrArea =
    dataLayers.filter(
      ({ seriesType }) => seriesType === SeriesTypes.BAR || seriesType === SeriesTypes.AREA
    ).length > 0;
  axes?.forEach((axis) => {
    if (
      hasBarOrArea &&
      axis.extent?.mode === AxisExtentModes.CUSTOM &&
      !areValidBounds(axis.extent)
    ) {
      throw new Error(errors.extendBoundsAreInvalidError());
    }

    if (!lineSeries.length && axis.extent?.mode === AxisExtentModes.DATA_BOUNDS) {
      throw new Error(errors.dataBoundsForNotLineChartError());
    }
  });
};

export const xyVisFunction: XyVisFn = {
  name: XY_VIS,
  type: 'render',
  inputTypes: ['datatable'],
  help: strings.getXYHelp(),
  args: {
    ...commonXYArgs,
    dataLayers: {
      types: [DATA_LAYER],
      help: strings.getDataLayerHelp(),
      multi: true,
    },
    referenceLineLayers: {
      types: [REFERENCE_LINE_LAYER],
      help: strings.getReferenceLineLayerHelp(),
      multi: true,
    },
    annotationLayers: {
      types: [ANNOTATION_LAYER],
      help: strings.getAnnotationLayerHelp(),
      multi: true,
    },
    xAxisConfig: {
      types: [X_AXIS_CONFIG],
      help: i18n.translate('expressionXY.xyVis.xAxisConfig.help', {
        defaultMessage: 'Specifies the configs for x-axis',
      }),
    },
    axes: {
      types: [Y_AXIS_CONFIG],
      help: i18n.translate('expressionXY.xyVis.axes.help', {
        defaultMessage: 'Specifies the configs for y-axes',
      }),
      multi: true,
    },
  },
  async fn(data, args, handlers) {
    const { xyVisFn } = await import('./xy_vis_fn');
    return await xyVisFn(data, args, handlers);
  },
};
