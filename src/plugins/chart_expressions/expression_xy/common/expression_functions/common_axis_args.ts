/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { strings } from '../i18n';
import { XAxisConfigFn, YAxisConfigFn } from '../types';
import { AXIS_EXTENT_CONFIG } from '../constants';

type CommonAxisConfigFn = XAxisConfigFn | YAxisConfigFn;

export const commonAxisConfigArgs: Omit<
  CommonAxisConfigFn['args'],
  'scaleType' | 'mode' | 'boundsMargin'
> = {
  title: {
    types: ['string'],
    help: strings.getAxisTitleHelp(),
  },
  id: {
    types: ['string'],
    help: strings.getAxisIdHelp(),
  },
  hide: {
    types: ['boolean'],
    help: strings.getAxisHideHelp(),
  },
  labelColor: {
    types: ['string'],
    help: strings.getAxisLabelColorHelp(),
  },
  showOverlappingLabels: {
    types: ['boolean'],
    help: strings.getAxisShowOverlappingLabelsHelp(),
  },
  showDuplicates: {
    types: ['boolean'],
    help: strings.getAxisShowDuplicatesHelp(),
  },
  showGridLines: {
    types: ['boolean'],
    help: strings.getAxisShowGridLinesHelp(),
    default: false,
  },
  labelsOrientation: {
    types: ['number'],
    options: [0, -90, -45],
    help: strings.getAxisLabelsOrientationHelp(),
  },
  showLabels: {
    types: ['boolean'],
    help: strings.getAxisShowLabelsHelp(),
    default: true,
  },
  showTitle: {
    types: ['boolean'],
    help: strings.getAxisShowTitleHelp(),
    default: true,
  },
  truncate: {
    types: ['number'],
    help: strings.getAxisTruncateHelp(),
  },
  extent: {
    types: [AXIS_EXTENT_CONFIG],
    help: strings.getAxisExtentHelp(),
    default: `{${AXIS_EXTENT_CONFIG}}`,
  },
};
