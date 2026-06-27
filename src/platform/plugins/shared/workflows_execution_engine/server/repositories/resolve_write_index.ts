/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export const resolveWriteIndex = async ({
  esClient,
  dataStreamName,
}: {
  esClient: ElasticsearchClient;
  dataStreamName: string;
}): Promise<string> => {
  const { data_streams: dataStreams } = await esClient.indices.getDataStream({
    name: dataStreamName,
  });

  const writeIndex = dataStreams[0]?.indices.at(-1)?.index_name;
  if (!writeIndex) {
    throw new Error(`No write backing index found for data stream ${dataStreamName}`);
  }
  return writeIndex;
};
