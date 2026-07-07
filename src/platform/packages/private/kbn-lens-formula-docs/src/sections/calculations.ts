/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const calculationsSection = {
  label: i18n.translate('lensFormulaDocs.documentation.columnCalculationSection', {
    defaultMessage: 'Column calculations',
  }),
  description: i18n.translate('lensFormulaDocs.documentation.columnCalculationSectionDescription', {
    defaultMessage:
      'These functions are executed for each row, but are provided with the whole column as context. This is also known as a window function.',
  }),
};
