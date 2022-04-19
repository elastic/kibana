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
} from '../constants';
import { strings } from '../i18n';
import { LayeredXyVisFn, XyVisFn } from '../types';

type CommonXYFn = XyVisFn | LayeredXyVisFn;

export const commonXYArgs: Omit<
  CommonXYFn['args'],
  'dataLayers' | 'referenceLineLayers' | 'annotationLayers' | 'layers'
> = {
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
  yLeftExtent: {
    types: [AXIS_EXTENT_CONFIG],
    help: strings.getYLeftExtentHelp(),
  },
  yRightExtent: {
    types: [AXIS_EXTENT_CONFIG],
    help: strings.getYRightExtentHelp(),
  },
  legend: {
    types: [LEGEND_CONFIG],
    help: strings.getLegendHelp(),
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
};
