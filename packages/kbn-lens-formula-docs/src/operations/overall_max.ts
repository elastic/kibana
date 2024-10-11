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

export const OVERALL_MAX_ID = 'overall_max';
export const OVERALL_MAX_NAME = i18n.translate('lensFormulaDocs.overallMax', {
  defaultMessage: 'Overall max',
});

export const overallMax: OperationDocumentationType = {
  id: OVERALL_MAX_ID,
  name: OVERALL_MAX_NAME,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('lensFormulaDocs.overall_metric', {
      defaultMessage: 'metric: number',
    }),
    description: i18n.translate('lensFormulaDocs.overall_max.documentation.markdown', {
      defaultMessage: `
Calculates the maximum of a metric for all data points of a series in the current chart. A series is defined by a dimension using a date histogram or interval function.
Other dimensions breaking down the data like top values or filter are treated as separate series.

If no date histograms or interval functions are used in the current chart, \`overall_max\` is calculating the maximum over all dimensions no matter the used function

Example: Percentage of range:  
\`(sum(bytes) - overall_min(sum(bytes))) / (overall_max(sum(bytes)) - overall_min(sum(bytes)))\`
`,
    }),
  },
};
