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

function buildDocumentationDefinition({
  id,
  name,
  documentation,
  signature,
  section,
}: {
  id: string;
  name: string;
  documentation: string;
  signature: string;
  section: 'elasticsearch' | 'calculation' | 'constants';
}): OperationDocumentationType {
  return {
    id,
    name,
    documentation: {
      section,
      signature,
      description: documentation,
    },
  };
}

export function buildMetricDocumentationDefinition({
  id,
  name,
  documentation,
}: {
  id: string;
  name: string;
  documentation?: string;
}): OperationDocumentationType {
  return buildDocumentationDefinition({
    id,
    name,
    documentation:
      documentation ||
      i18n.translate('lensFormulaDocs.metric.documentation.markdown', {
        defaultMessage: `
Returns the {metric} of a field. This function only works for number fields.

Example: Get the {metric} of price:  
\`{metric}(price)\`

Example: Get the {metric} of price for orders from the UK:  
\`{metric}(price, kql='location:UK')\`
            `,
        values: {
          metric: id,
        },
      }),
    section: 'elasticsearch',
    signature: i18n.translate('lensFormulaDocs.metric.signature', {
      defaultMessage: 'field: string',
    }),
  });
}

export function buildContextVariableDocumentationDefinition({
  id,
  name,
  documentation,
}: {
  id: string;
  name: string;
  documentation: string;
}): OperationDocumentationType {
  return buildDocumentationDefinition({
    id,
    name,
    documentation,
    section: 'constants',
    signature: '',
  });
}
