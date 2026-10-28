/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runDocumentComparisonSuite } from '../helpers/document_comparison_shared';

const ESQL_QUERY = 'from logstash-* | sort @timestamp desc | limit 10';

// ES|QL results use positional labels ("Result 1/2") instead of document IDs
runDocumentComparisonSuite({
  suiteName: 'ES|QL mode',
  comparisonDisplay: 'Comparing 2 results',
  tableHeaders: ['Field', 'Result 1', 'Result 2'],
  fullFieldNames: [
    '@timestamp',
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
    'geo.src',
    'geo.srcdest',
  ],
  setup: async (pageObjects) => {
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.writeAndSubmitEsqlQuery(ESQL_QUERY);
    await pageObjects.discover.waitUntilSearchingHasFinished();
  },
});
