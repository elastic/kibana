/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AXIS_EXTENT_CONFIG,
  AXIS_TITLES_VISIBILITY_CONFIG,
  EndValues,
  FittingFunctions,
  GRID_LINES_CONFIG,
  LABELS_ORIENTATION_CONFIG,
  LEGEND_CONFIG,
  TICK_LABELS_CONFIG,
  ValueLabelModes,
  XYCurveTypes,
  YScaleTypes,
} from '../constants';
import { strings } from '../i18n';
import { LayeredXyVisFn, XyVisFn } from '../types';

type CommonXYFn = XyVisFn | LayeredXyVisFn;

export const commonXYArgs: CommonXYFn['args'] = {
  xTitle: {
    types: ['string'],
    help: strings.getXTitleHelp(),
  },
  yTitle: {
    types: ['string'],
    help: strings.getYTitleHelp(),
  },
  yRightTitle: {
    types: ['string'],
    help: strings.getYRightTitleHelp(),
  },
  xExtent: {
    types: [AXIS_EXTENT_CONFIG],
    help: strings.getXExtentHelp(),
    default: `{${AXIS_EXTENT_CONFIG}}`,
  },
  yLeftExtent: {
    types: [AXIS_EXTENT_CONFIG],
    help: strings.getYLeftExtentHelp(),
    default: `{${AXIS_EXTENT_CONFIG}}`,
  },
  yRightExtent: {
    types: [AXIS_EXTENT_CONFIG],
    help: strings.getYRightExtentHelp(),
    default: `{${AXIS_EXTENT_CONFIG}}`,
  },
  yLeftScale: {
    options: [...Object.values(YScaleTypes)],
    help: strings.getYLeftScaleTypeHelp(),
    default: YScaleTypes.LINEAR,
    strict: true,
  },
  yRightScale: {
    options: [...Object.values(YScaleTypes)],
    help: strings.getYRightScaleTypeHelp(),
    default: YScaleTypes.LINEAR,
    strict: true,
  },
  legend: {
    types: [LEGEND_CONFIG],
    help: strings.getLegendHelp(),
    default: `{${LEGEND_CONFIG}}`,
  },
  fittingFunction: {
    types: ['string'],
    options: [...Object.values(FittingFunctions)],
    help: strings.getFittingFunctionHelp(),
    strict: true,
  },
  endValue: {
    types: ['string'],
    options: [...Object.values(EndValues)],
    help: strings.getEndValueHelp(),
    strict: true,
  },
  emphasizeFitting: {
    types: ['boolean'],
    default: false,
    help: '',
  },
  valueLabels: {
    types: ['string'],
    options: [...Object.values(ValueLabelModes)],
    help: strings.getValueLabelsHelp(),
    strict: true,
    default: ValueLabelModes.HIDE,
  },
  tickLabelsVisibilitySettings: {
    types: [TICK_LABELS_CONFIG],
    help: strings.getTickLabelsVisibilitySettingsHelp(),
  },
  labelsOrientation: {
    types: [LABELS_ORIENTATION_CONFIG],
    help: strings.getLabelsOrientationHelp(),
  },
  gridlinesVisibilitySettings: {
    types: [GRID_LINES_CONFIG],
    help: strings.getGridlinesVisibilitySettingsHelp(),
  },
  axisTitlesVisibilitySettings: {
    types: [AXIS_TITLES_VISIBILITY_CONFIG],
    help: strings.getAxisTitlesVisibilitySettingsHelp(),
  },
  curveType: {
    types: ['string'],
    options: [...Object.values(XYCurveTypes)],
    help: strings.getCurveTypeHelp(),
    strict: true,
  },
  fillOpacity: {
    types: ['number'],
    help: strings.getFillOpacityHelp(),
  },
  hideEndzones: {
    types: ['boolean'],
    default: false,
    help: strings.getHideEndzonesHelp(),
  },
  valuesInLegend: {
    types: ['boolean'],
    default: false,
    help: strings.getValuesInLegendHelp(),
  },
  ariaLabel: {
    types: ['string'],
    help: strings.getAriaLabelHelp(),
  },
  detailedTooltip: {
    types: ['boolean'],
    help: strings.getDetailedTooltipHelp(),
  },
  showTooltip: {
    types: ['boolean'],
    default: true,
    help: strings.getShowTooltipHelp(),
  },
  orderBucketsBySum: {
    types: ['boolean'],
    default: false,
    help: strings.getOrderBucketsBySum(),
  },
  addTimeMarker: {
    types: ['boolean'],
    default: false,
    help: strings.getAddTimeMakerHelp(),
  },
  markSizeRatio: {
    types: ['number'],
    help: strings.getMarkSizeRatioHelp(),
  },
  minTimeBarInterval: {
    types: ['string'],
    help: strings.getMinTimeBarIntervalHelp(),
  },
};
