/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Position } from '@elastic/charts';
import { strings } from '../i18n';
import { Y_AXIS_CONFIG, AxisModes, YScaleTypes } from '../constants';
import { YAxisConfigFn } from '../types';
import { commonAxisConfigArgs } from './common_axis_args';

export const yAxisConfigFunction: YAxisConfigFn = {
  name: Y_AXIS_CONFIG,
  aliases: [],
  type: Y_AXIS_CONFIG,
  help: strings.getYAxisConfigFnHelp(),
  inputTypes: ['null'],
  args: {
    ...commonAxisConfigArgs,
    mode: {
      types: ['string'],
      options: [...Object.values(AxisModes)],
      help: strings.getAxisModeHelp(),
    },
    boundsMargin: {
      types: ['number'],
      help: strings.getAxisBoundsMarginHelp(),
    },
    scaleType: {
      options: [...Object.values(YScaleTypes)],
      help: strings.getAxisScaleTypeHelp(),
      default: YScaleTypes.LINEAR,
    },
    position: {
      types: ['string'],
      options: [Position.Right, Position.Left],
      help: strings.getAxisPositionHelp(),
      strict: true,
    },
  },
  fn(input, args) {
    return {
      type: Y_AXIS_CONFIG,
      ...args,
      position: args.position ?? Position.Left,
    };
  },
};
