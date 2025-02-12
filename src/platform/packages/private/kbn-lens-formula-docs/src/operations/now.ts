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

export const NOW_ID = 'now';
export const NOW_NAME = i18n.translate('lensFormulaDocs.now', {
  defaultMessage: 'Current now',
});

export const now = buildContextVariableDocumentationDefinition({
  id: NOW_ID,
  name: NOW_NAME,
  documentation: i18n.translate('lensFormulaDocs.now.help', {
    defaultMessage: `
The current now moment used in Kibana expressed in milliseconds (ms).

Example: How long (in ms) has been the server running since the last restart? 
\`now() - last_value(start_time)\`
`,
  }),
});
