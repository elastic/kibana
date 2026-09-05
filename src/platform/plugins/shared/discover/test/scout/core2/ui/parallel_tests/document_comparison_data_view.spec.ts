/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runDocumentComparisonSuite } from '../helpers/document_comparison_shared';

// Data view mode uses document IDs as column headers instead of positional labels
runDocumentComparisonSuite({
  suiteName: 'data view mode',
  comparisonDisplay: 'Comparing 2 documents',
  tableHeaders: ['Field', 'AU_x3_g4GFA8no6QjkYX', 'AU_x3-TcGFA8no6Qjipx'],
  fullFieldNames: [
    '@timestamp',
    '_id',
    '_index',
    '@message',
    '@message.raw',
    '@tags',
    '@tags.raw',
    'agent',
    'agent.raw',
    'bytes',
    'clientip',
    'extension',
    'extension.raw',
    'geo.coordinates',
    'geo.dest',
  ],
  setup: async (pageObjects) => {
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  },
});
