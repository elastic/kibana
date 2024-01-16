/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { OperationDocumentationType } from './types';

export const LAST_VALUE_ID = 'last_value';
export const LAST_VALUE_NAME = i18n.translate('lensFormulaDocs.lastValue', {
  defaultMessage: 'Last value',
});

export const lastValue: OperationDocumentationType = {
  id: LAST_VALUE_ID,
  name: LAST_VALUE_NAME,
  documentation: {
    section: 'elasticsearch',
    signature: i18n.translate('lensFormulaDocs.lastValue.signature', {
      defaultMessage: 'field: string',
    }),
    description: i18n.translate('lensFormulaDocs.lastValue.documentation.markdown', {
      defaultMessage: `
Returns the value of a field from the last document, ordered by the default time field of the data view.

This function is usefull the retrieve the latest state of an entity.

Example: Get the current status of server A:  
\`last_value(server.status, kql=\'server.name="A"\')\`
`,
    }),
  },
};
