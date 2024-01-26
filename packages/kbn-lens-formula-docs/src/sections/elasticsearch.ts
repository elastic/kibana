/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const elasticsearchSection = {
  label: i18n.translate('lensFormulaDocs.documentation.elasticsearchSection', {
    defaultMessage: 'Elasticsearch',
  }),
  description: i18n.translate('lensFormulaDocs.documentation.elasticsearchSectionDescription', {
    defaultMessage:
      'These functions will be executed on the raw documents for each row of the resulting table, aggregating all documents matching the break down dimensions into a single value.',
  }),
};
