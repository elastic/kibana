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

export const OVERALL_AVERAGE_ID = 'overall_average';
export const OVERALL_AVERAGE_NAME = i18n.translate('lensFormulaDocs.overallAverage', {
  defaultMessage: 'Overall average',
});

export const overallAverge: OperationDocumentationType = {
  id: OVERALL_AVERAGE_ID,
  name: OVERALL_AVERAGE_NAME,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('lensFormulaDocs.overall_metric', {
      defaultMessage: 'metric: number',
    }),
    description: i18n.translate('lensFormulaDocs.overall_average.documentation.markdown', {
      defaultMessage: `
Calculates the average of a metric for all data points of a series in the current chart. A series is defined by a dimension using a date histogram or interval function.
Other dimensions breaking down the data like top values or filter are treated as separate series.

If no date histograms or interval functions are used in the current chart, \`overall_average\` is calculating the average over all dimensions no matter the used function

Example: Divergence from the mean:  
\`sum(bytes) - overall_average(sum(bytes))\`
`,
    }),
  },
};
