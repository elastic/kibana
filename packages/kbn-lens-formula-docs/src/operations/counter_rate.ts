/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { OperationDocumentationType } from './types';

export const COUNTER_RATE_ID = 'counter_rate';
export const COUNTER_RATE_NAME = i18n.translate('lensFormulaDocs.counterRate', {
  defaultMessage: 'Counter rate',
});

export const counterRate: OperationDocumentationType = {
  id: COUNTER_RATE_ID,
  name: COUNTER_RATE_NAME,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('lensFormulaDocs.counterRate.signature', {
      defaultMessage: 'metric: number',
    }),
    description: i18n.translate('lensFormulaDocs.counterRate.documentation.markdown', {
      defaultMessage: `
Calculates the rate of an ever increasing counter. This function will only yield helpful results on counter metric fields which contain a measurement of some kind monotonically growing over time.
If the value does get smaller, it will interpret this as a counter reset. To get most precise results, \`counter_rate\` should be calculated on the \`max\` of a field.

This calculation will be done separately for separate series defined by filters or top values dimensions.
It uses the current interval when used in Formula.

Example: Visualize the rate of bytes received over time by a memcached server:  
\`counter_rate(max(memcached.stats.read.bytes))\`
      `,
    }),
  },
};
