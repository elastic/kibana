/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { OperationDocumentationType } from './types';

export const MOVING_AVERAGE_ID = 'moving_average';
export const MOVING_AVERAGE_NAME = i18n.translate('lensFormulaDocs.movingAverage', {
  defaultMessage: 'Moving average',
});
export const MOVING_AVERAGE_WINDOW_DEFAULT_VALUE = 5;

export const movingAverage: OperationDocumentationType = {
  id: MOVING_AVERAGE_ID,
  name: MOVING_AVERAGE_NAME,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('lensFormulaDocs.moving_average.signature', {
      defaultMessage: 'metric: number, [window]: number',
    }),
    description: i18n.translate('lensFormulaDocs.movingAverage.documentation.markdown', {
      defaultMessage: `
Calculates the moving average of a metric over time, averaging the last n-th values to calculate the current value. To use this function, you need to configure a date histogram dimension as well.
The default window value is {defaultValue}.

This calculation will be done separately for separate series defined by filters or top values dimensions.

Takes a named parameter \`window\` which specifies how many last values to include in the average calculation for the current value.

Example: Smooth a line of measurements:  
\`moving_average(sum(bytes), window=5)\`
`,
      values: {
        defaultValue: MOVING_AVERAGE_WINDOW_DEFAULT_VALUE,
      },
    }),
  },
};
