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

export const PERCENTILE_ID = 'percentile';
export const PERCENTILE_NAME = i18n.translate('lensFormulaDocs.percentile', {
  defaultMessage: 'Percentile',
});

export const percentile: OperationDocumentationType = {
  id: PERCENTILE_ID,
  name: PERCENTILE_NAME,
  documentation: {
    section: 'elasticsearch',
    signature: i18n.translate('lensFormulaDocs.percentile.signature', {
      defaultMessage: 'field: string, [percentile]: number',
    }),
    description: i18n.translate('lensFormulaDocs.percentile.documentation.markdown', {
      defaultMessage: `
Returns the specified percentile of the values of a field. This is the value n percent of the values occuring in documents are smaller.

Example: Get the number of bytes larger than 95 % of values:  
\`percentile(bytes, percentile=95)\`
`,
    }),
  },
};
