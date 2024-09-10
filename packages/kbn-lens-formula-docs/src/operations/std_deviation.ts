/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { buildMetricDocumentationDefinition } from './helpers';

export const STD_DEVIATION_ID = 'standard_deviation';
export const STD_DEVIATION_NAME = i18n.translate('lensFormulaDocs.standardDeviation', {
  defaultMessage: 'Standard deviation',
});

export const stdDeviation = buildMetricDocumentationDefinition({
  id: STD_DEVIATION_ID,
  name: STD_DEVIATION_NAME,
  documentation: i18n.translate('lensFormulaDocs.standardDeviation.documentation.markdown', {
    defaultMessage: `
Returns the amount of variation or dispersion of the field. The function works only for number fields.

#### Examples

To get the standard deviation of price, use \`standard_deviation(price)\`.

To get the variance of price for orders from the UK, use \`square(standard_deviation(price, kql='location:UK'))\`.
`,
  }),
});
