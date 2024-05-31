/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { OperationDocumentationType } from './types';

export const CUMULATIVE_SUM_ID = 'cumulative_sum';
export const CUMULATIVE_SUM_NAME = i18n.translate('lensFormulaDocs.cumulativeSum', {
  defaultMessage: 'Cumulative sum',
});

export const cumulativeSum: OperationDocumentationType = {
  id: CUMULATIVE_SUM_ID,
  name: CUMULATIVE_SUM_NAME,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('lensFormulaDocs.cumulative_sum.signature', {
      defaultMessage: 'metric: number',
    }),
    description: i18n.translate('lensFormulaDocs.cumulativeSum.documentation.markdown', {
      defaultMessage: `
Calculates the cumulative sum of a metric over time, adding all previous values of a series to each value. To use this function, you need to configure a date histogram dimension as well.

This calculation will be done separately for separate series defined by filters or top values dimensions.

Example: Visualize the received bytes accumulated over time:  
\`cumulative_sum(sum(bytes))\`
`,
    }),
  },
};
