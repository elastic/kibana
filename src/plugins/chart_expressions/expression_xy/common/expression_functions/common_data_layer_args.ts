/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ArgumentType } from '@kbn/expressions-plugin/common';
import { SeriesTypes, XScaleTypes, DATA_DECORATION_CONFIG } from '../constants';
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
  previewMode: {
    types: ['boolean'],
    default: false,
    help: strings.getPreviewMode(),
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
};
