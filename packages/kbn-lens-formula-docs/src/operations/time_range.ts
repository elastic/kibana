/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { buildContextVariableDocumentationDefinition } from './helpers';

export const TIME_RANGE_ID = 'time_range';
export const TIME_RANGE_NAME = i18n.translate('lensFormulaDocs.time_range', {
  defaultMessage: 'Time range',
});

export const timeRange = buildContextVariableDocumentationDefinition({
  id: TIME_RANGE_ID,
  name: TIME_RANGE_NAME,
  documentation: i18n.translate('lensFormulaDocs.timeRange.help', {
    defaultMessage: `
The specified time range, in milliseconds (ms).

Example: How long is the current time range in (ms)?
\`time_range()\`

Example: A static average per minute computed with the current time range:
\`(sum(bytes) / time_range()) * 1000 * 60\`
`,
  }),
});
