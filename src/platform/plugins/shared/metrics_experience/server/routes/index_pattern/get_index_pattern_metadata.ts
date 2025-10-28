/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TracedElasticsearchClient } from '@kbn/traced-es-client';

export const getIndexPatternMetadata = async ({
  esClient,
  indexPattern,
}: {
  esClient: TracedElasticsearchClient;
  indexPattern: string;
}) => {
  const { data_streams: dataStreams } = await esClient.client.indices.resolveIndex({
    name: indexPattern,
    expand_wildcards: 'open',
    mode: 'time_series',
  });

  return {
    hasTimeSeriesDataStreams: dataStreams.length > 0,
  };
};
