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

export const PERCENTILE_RANK_ID = 'percentile_rank';
export const PERCENTILE_RANK_NAME = i18n.translate('lensFormulaDocs.percentileRank', {
  defaultMessage: 'Percentile rank',
});

export const percentileRank: OperationDocumentationType = {
  id: PERCENTILE_RANK_ID,
  name: PERCENTILE_RANK_NAME,
  documentation: {
    section: 'elasticsearch',
    signature: i18n.translate('lensFormulaDocs.percentileRanks.signature', {
      defaultMessage: 'field: string, [value]: number',
    }),
    description: i18n.translate('lensFormulaDocs.percentileRanks.documentation.markdown', {
      defaultMessage: `
Returns the percentage of values which are below a certain value. For example, if a value is greater than or equal to 95% of the observed values it is said to be at the 95th percentile rank

Example: Get the percentage of values which are below of 100:  
\`percentile_rank(bytes, value=100)\`
`,
    }),
  },
};
