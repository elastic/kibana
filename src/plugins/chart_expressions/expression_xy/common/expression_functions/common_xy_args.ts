/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EndValues,
  FittingFunctions,
  LEGEND_CONFIG,
  ValueLabelModes,
  X_AXIS_CONFIG,
  Y_AXIS_CONFIG,
} from '../constants';
import { strings } from '../i18n';
import { LayeredXyVisFn, XyVisFn } from '../types';

type CommonXYFn = XyVisFn | LayeredXyVisFn;

export const commonXYArgs: CommonXYFn['args'] = {
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
  xAxisConfig: {
    types: [X_AXIS_CONFIG],
    help: strings.getXAxisConfigHelp(),
  },
  yAxisConfigs: {
    types: [Y_AXIS_CONFIG],
    help: strings.getyAxisConfigsHelp(),
    multi: true,
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
  minBarHeight: {
    types: ['number'],
    help: strings.getMinBarHeightHelp(),
  },
};
