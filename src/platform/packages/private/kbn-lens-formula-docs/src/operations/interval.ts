/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { buildContextVariableDocumentationDefinition } from './helpers';

export const INTERVAL_ID = 'interval';
export const INTERVAL_NAME = i18n.translate('lensFormulaDocs.interval', {
  defaultMessage: 'Date histogram interval',
});

export const interval = buildContextVariableDocumentationDefinition({
  id: INTERVAL_ID,
  name: INTERVAL_NAME,
  documentation: i18n.translate('lensFormulaDocs.interval.help', {
    defaultMessage: `
The specified minimum interval for the date histogram, in milliseconds (ms).

Example: Dynamically normalize the metric based on bucket interval size:  
\`sum(bytes) / interval()\`
`,
  }),
});
