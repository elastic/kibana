/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

import { ScaleType } from '../types';

export const getScaleTypes = () => [
  {
    text: i18n.translate('visTypeXy.scaleTypes.linearText', {
      defaultMessage: 'Linear',
    }),
    value: ScaleType.Linear,
  },
  {
    text: i18n.translate('visTypeXy.scaleTypes.logText', {
      defaultMessage: 'Log',
    }),
    value: ScaleType.Log,
  },
  {
    text: i18n.translate('visTypeXy.scaleTypes.squareRootText', {
      defaultMessage: 'Square root',
    }),
    value: ScaleType.SquareRoot,
  },
];
