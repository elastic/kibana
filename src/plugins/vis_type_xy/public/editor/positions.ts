/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { Position } from '@elastic/charts';

export const getPositions = () => [
  {
    text: i18n.translate('visTypeXy.legendPositions.topText', {
      defaultMessage: 'Top',
    }),
    value: Position.Top,
  },
  {
    text: i18n.translate('visTypeXy.legendPositions.leftText', {
      defaultMessage: 'Left',
    }),
    value: Position.Left,
  },
  {
    text: i18n.translate('visTypeXy.legendPositions.rightText', {
      defaultMessage: 'Right',
    }),
    value: Position.Right,
  },
  {
    text: i18n.translate('visTypeXy.legendPositions.bottomText', {
      defaultMessage: 'Bottom',
    }),
    value: Position.Bottom,
  },
];
