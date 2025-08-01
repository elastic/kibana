/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

// DO NOT RENAME!
export const functions = {
  label: i18n.translate('languageDocumentation.documentationESQL.timeseriesAggregationFunctions', {
    defaultMessage: 'Timeseries aggregation functions',
  }),
  description: i18n.translate(
    'languageDocumentation.documentationESQL.timeseriesAggregationFunctionsDocumentationESQLDescription',
    {
      defaultMessage: `These functions can by used with STATS ...BY when a TS command is used:`,
    }
  ),
  // items are managed by scripts/generate_esql_docs.ts
  items: [],
};
