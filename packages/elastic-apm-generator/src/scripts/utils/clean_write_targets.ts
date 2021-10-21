/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ElasticsearchOutputWriteTargets } from '../../lib/output/to_elasticsearch_output';

export function cleanWriteTargets({
  writeTargets,
  client,
}: {
  writeTargets: ElasticsearchOutputWriteTargets;
  client: Client;
}) {
  const targets = Object.values(writeTargets);

  return client.deleteByQuery({
    index: targets,
    body: {
      query: {
        match_all: {},
      },
    },
  });
}
