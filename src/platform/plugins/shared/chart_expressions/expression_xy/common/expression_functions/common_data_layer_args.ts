/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ArgumentType } from '@kbn/expressions-plugin/common';
import { SeriesTypes, XScaleTypes, DATA_DECORATION_CONFIG, XYCurveTypes } from '../constants';
import { strings } from '../i18n';
import { DataLayerArgs, ExtendedDataLayerArgs } from '../types';

type CommonDataLayerArgs = ExtendedDataLayerArgs | DataLayerArgs;
type CommonDataLayerFnArgs = {
  [key in keyof CommonDataLayerArgs]: ArgumentType<CommonDataLayerArgs[key]>;
};

export const commonDataLayerArgs: Omit<
  CommonDataLayerFnArgs,
  'accessors' | 'xAccessor' | 'splitAccessor'
> = {
  simpleView: {
    types: ['boolean'],
    default: false,
    help: strings.getSimpleView(),
  },
  seriesType: {
    aliases: ['_'],
    types: ['string'],
    options: [...Object.values(SeriesTypes)],
    help: strings.getSeriesTypeHelp(),
    required: true,
    strict: true,
  },
  xScaleType: {
    options: [...Object.values(XScaleTypes)],
    help: strings.getXScaleTypeHelp(),
    strict: true,
  },
  isHistogram: {
    types: ['boolean'],
    default: false,
    help: strings.getIsHistogramHelp(),
  },
  isPercentage: {
    types: ['boolean'],
    default: false,
    help: strings.getIsPercentageHelp(),
  },
  isStacked: {
    types: ['boolean'],
    default: false,
    help: strings.getIsStackedHelp(),
  },
  isHorizontal: {
    types: ['boolean'],
    default: false,
    help: strings.getIsHorizontalHelp(),
  },
  curveType: {
    types: ['string'],
    options: [...Object.values(XYCurveTypes)],
    help: strings.getCurveTypeHelp(),
    strict: true,
  },
  lineWidth: {
    types: ['number'],
    help: strings.getLineWidthHelp(),
  },
  showPoints: {
    types: ['boolean'],
    help: strings.getShowPointsHelp(),
  },
  pointsRadius: {
    types: ['number'],
    help: strings.getPointsRadiusHelp(),
  },
  showLines: {
    types: ['boolean'],
    help: strings.getShowLinesHelp(),
  },
  decorations: {
    types: [DATA_DECORATION_CONFIG],
    help: strings.getDecorationsHelp(),
    multi: true,
  },
  columnToLabel: {
    types: ['string'],
    help: strings.getColumnToLabelHelp(),
  },
  palette: {
    types: ['palette', 'system_palette'],
    help: strings.getPaletteHelp(),
    default: '{palette}',
  },
  colorMapping: {
    types: ['string'],
    help: strings.getColorMappingHelp(),
  },
};
