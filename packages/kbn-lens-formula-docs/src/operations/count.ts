/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { OperationDocumentationType } from './types';

export const COUNT_ID = 'count';
export const COUNT_NAME = i18n.translate('lensFormulaDocs.count', {
  defaultMessage: 'Count',
});

export const count: OperationDocumentationType = {
  id: COUNT_ID,
  name: COUNT_NAME,
  documentation: {
    section: 'elasticsearch',
    signature: i18n.translate('lensFormulaDocs.count.signature', {
      defaultMessage: '[field: string]',
    }),
    description: i18n.translate('lensFormulaDocs.count.documentation.markdown', {
      defaultMessage: `
The total number of documents. When you provide a field, the total number of field values is counted. When you use the Count function for fields that have multiple values in a single document, all values are counted.

#### Examples

To calculate the total number of documents, use \`count()\`.

To calculate the number of products in all orders, use \`count(products.id)\`.

To calculate the number of documents that match a specific filter, use \`count(kql='price > 500')\`.
`,
    }),
  },
};
