/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SeriesTypes, XScaleTypes, YScaleTypes, Y_CONFIG } from '../constants';
import { strings } from '../i18n';
import { DataLayerFn, ExtendedDataLayerFn } from '../types';

type CommonDataLayerFn = DataLayerFn | ExtendedDataLayerFn;

export const commonDataLayerArgs: Omit<CommonDataLayerFn['args'], 'table'> = {
  hide: {
    types: ['boolean'],
    default: false,
    help: strings.getHideHelp(),
  },
  xAccessor: {
    types: ['string'],
    help: strings.getXAccessorHelp(),
  },
  seriesType: {
    types: ['string'],
    options: [...Object.values(SeriesTypes)],
    help: strings.getSeriesTypeHelp(),
    required: true,
    strict: true,
  },
  xScaleType: {
    options: [...Object.values(XScaleTypes)],
    help: strings.getXScaleTypeHelp(),
    default: XScaleTypes.ORDINAL,
    strict: true,
  },
  isHistogram: {
    types: ['boolean'],
    default: false,
    help: strings.getIsHistogramHelp(),
  },
  yScaleType: {
    options: [...Object.values(YScaleTypes)],
    help: strings.getYScaleTypeHelp(),
    default: YScaleTypes.LINEAR,
    strict: true,
  },
  splitAccessor: {
    types: ['string'],
    help: strings.getSplitAccessorHelp(),
  },
  accessors: {
    types: ['string'],
    help: strings.getAccessorsHelp(),
    multi: true,
  },
  yConfig: {
    types: [Y_CONFIG],
    help: strings.getYConfigHelp(),
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
