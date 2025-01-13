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

export const DIFFERENCES_ID = 'differences';
export const DIFFERENCES_NAME = i18n.translate('lensFormulaDocs.derivative', {
  defaultMessage: 'Differences',
});

export const differences: OperationDocumentationType = {
  id: DIFFERENCES_ID,
  name: DIFFERENCES_NAME,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('lensFormulaDocs.differences.signature', {
      defaultMessage: 'metric: number',
    }),
    description: i18n.translate('lensFormulaDocs.differences.documentation.markdown', {
      defaultMessage: `
Calculates the difference to the last value of a metric over time. To use this function, you need to configure a date histogram dimension as well.
Differences requires the data to be sequential. If your data is empty when using differences, try increasing the date histogram interval.

This calculation will be done separately for separate series defined by filters or top values dimensions.

Example: Visualize the change in bytes received over time:  
\`differences(sum(bytes))\`
`,
    }),
  },
};
