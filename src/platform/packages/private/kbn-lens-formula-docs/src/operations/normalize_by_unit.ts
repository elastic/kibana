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

export const NORMALIZE_BY_UNIT_ID = 'normalize_by_unit';
export const NORMALIZE_BY_UNIT_NAME = i18n.translate('lensFormulaDocs.timeScale', {
  defaultMessage: 'Normalize by unit',
});

export const normalizeByUnit: OperationDocumentationType = {
  id: NORMALIZE_BY_UNIT_ID,
  name: NORMALIZE_BY_UNIT_NAME,
  documentation: {
    section: 'calculation',
    signature: i18n.translate('lensFormulaDocs.time_scale', {
      defaultMessage: 'metric: number, unit: s|m|h|d|w|M|y',
    }),
    description: i18n.translate('lensFormulaDocs.time_scale.documentation.markdown', {
      defaultMessage: `
This advanced function is useful for normalizing counts and sums to a specific time interval. It allows for integration with metrics that are stored already normalized to a specific time interval.

This function can only be used if there's a date histogram function used in the current chart.

Example: A ratio comparing an already normalized metric to another metric that needs to be normalized.  
\`normalize_by_unit(counter_rate(max(system.diskio.write.bytes)), unit='s') / last_value(apache.status.bytes_per_second)\`
`,
    }),
  },
};
