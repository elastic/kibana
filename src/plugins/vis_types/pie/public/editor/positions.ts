/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { Position } from '@elastic/charts';

export const getLegendPositions = [
  {
    text: i18n.translate('visTypePie.legendPositions.topText', {
      defaultMessage: 'Top',
    }),
    value: Position.Top,
  },
  {
    text: i18n.translate('visTypePie.legendPositions.leftText', {
      defaultMessage: 'Left',
    }),
    value: Position.Left,
  },
  {
    text: i18n.translate('visTypePie.legendPositions.rightText', {
      defaultMessage: 'Right',
    }),
    value: Position.Right,
  },
  {
    text: i18n.translate('visTypePie.legendPositions.bottomText', {
      defaultMessage: 'Bottom',
    }),
    value: Position.Bottom,
  },
];
