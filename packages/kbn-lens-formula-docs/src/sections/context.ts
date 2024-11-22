/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const contextSection = {
  label: i18n.translate('lensFormulaDocs.documentation.constantsSection', {
    defaultMessage: 'Kibana context',
  }),
  description: i18n.translate('lensFormulaDocs.documentation.constantsSectionDescription', {
    defaultMessage:
      'These functions are used to retrieve Kibana context variables, which are the date histogram `interval`, the current `now` and the selected `time_range` and help you to compute date math operations.',
  }),
};
