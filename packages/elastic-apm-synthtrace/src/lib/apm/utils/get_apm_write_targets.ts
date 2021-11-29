/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ApmElasticsearchOutputWriteTargets } from './apm_events_to_elasticsearch_output';

export async function getApmWriteTargets({
  client,
}: {
  client: Client;
}): Promise<ApmElasticsearchOutputWriteTargets> {
  const [indicesResponse, datastreamsResponse] = await Promise.all([
    client.indices.getAlias({
      index: 'apm-*',
    }),
    client.indices.getDataStream({
      name: '*apm',
    }),
  ]);

  function getDataStreamName(filter: string) {
    return datastreamsResponse.data_streams.find((stream) => stream.name.includes(filter))?.name;
  }

  function getAlias(filter: string) {
    return Object.keys(indicesResponse)
      .map((key) => {
        return {
          key,
          writeIndexAlias: Object.entries(indicesResponse[key].aliases).find(
            ([_, alias]) => alias.is_write_index
          )?.[0],
        };
      })
      .find(({ key, writeIndexAlias }) => writeIndexAlias && key.includes(filter))
      ?.writeIndexAlias!;
  }

  const targets = {
    transaction: getDataStreamName('traces-apm') || getAlias('-transaction'),
    span: getDataStreamName('traces-apm') || getAlias('-span'),
    metric: getDataStreamName('metrics-apm') || getAlias('-metric'),
    error: getDataStreamName('logs-apm') || getAlias('-error'),
  };

  if (!targets.transaction || !targets.span || !targets.metric || !targets.error) {
    throw new Error('Write targets could not be determined');
  }

  return targets;
}
