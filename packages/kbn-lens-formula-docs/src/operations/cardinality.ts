/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { OperationDocumentationType } from './types';

export const CARDINALITY_ID = 'unique_count';
export const CARDINALITY_NAME = i18n.translate('lensFormulaDocs.cardinality', {
  defaultMessage: 'Unique Count',
});

export const cardinality: OperationDocumentationType = {
  id: CARDINALITY_ID,
  name: CARDINALITY_NAME,
  documentation: {
    section: 'elasticsearch',
    signature: i18n.translate('lensFormulaDocs.cardinality.signature', {
      defaultMessage: 'field: string',
    }),
    description: i18n.translate('lensFormulaDocs.cardinality.documentation.markdown', {
      defaultMessage: `
Calculates the number of unique values of a specified field. Works for number, string, date and boolean values.

Example: Calculate the number of different products:  
\`unique_count(product.name)\`

Example: Calculate the number of different products from the "clothes" group:  
\`unique_count(product.name, kql='product.group=clothes')\`
      `,
    }),
  },
};
