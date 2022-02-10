/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Position } from '@elastic/charts';
import { ScaleType } from '../types';

export const legendPositions = [
  {
    text: i18n.translate('visTypeHeatmap.legendPositions.topText', {
      defaultMessage: 'Top',
    }),
    value: Position.Top,
  },
  {
    text: i18n.translate('visTypeHeatmap.legendPositions.leftText', {
      defaultMessage: 'Left',
    }),
    value: Position.Left,
  },
  {
    text: i18n.translate('visTypeHeatmap.legendPositions.rightText', {
      defaultMessage: 'Right',
    }),
    value: Position.Right,
  },
  {
    text: i18n.translate('visTypeHeatmap.legendPositions.bottomText', {
      defaultMessage: 'Bottom',
    }),
    value: Position.Bottom,
  },
];

export const scaleTypes = [
  {
    text: i18n.translate('visTypeHeatmap.scaleTypes.linearText', {
      defaultMessage: 'Linear',
    }),
    value: ScaleType.Linear,
  },
  {
    text: i18n.translate('visTypeHeatmap.scaleTypes.logText', {
      defaultMessage: 'Log',
    }),
    value: ScaleType.Log,
  },
  {
    text: i18n.translate('visTypeHeatmap.scaleTypes.squareRootText', {
      defaultMessage: 'Square root',
    }),
    value: ScaleType.SquareRoot,
  },
];
