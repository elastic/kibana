/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { buildMetricDocumentationDefinition } from './helpers';

export const MEDIAN_ID = 'median';
export const MEDIAN_NAME = i18n.translate('lensFormulaDocs.median', {
  defaultMessage: 'Median',
});

export const median = buildMetricDocumentationDefinition({
  id: MEDIAN_ID,
  name: MEDIAN_NAME,
});
