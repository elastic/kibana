/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook, tags } from '@kbn/scout';

// Indices created by the makelogs es_archiver archive. They match `logstash-*`, so leaving them
// behind changes results for other suites that query `logstash-*` on the same cluster.
const MAKELOGS_INDICES = ['logstash-2015.09.17', 'logstash-2015.09.18'];

globalTeardownHook(
  'Remove makelogs ES data loaded for data view management Scout tests',
  { tag: tags.deploymentAgnostic },
  async ({ esClient, log }) => {
    log.info('[teardown] Deleting makelogs indices...');
    await esClient.indices.delete({ index: MAKELOGS_INDICES, ignore_unavailable: true });
    log.info('[teardown] makelogs indices deleted');
  }
);
