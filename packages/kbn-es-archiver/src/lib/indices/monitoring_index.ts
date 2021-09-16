/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { inspect } from 'util';

import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import { ToolingLog } from '@kbn/dev-utils';
import { Stats } from '../stats';
import { ES_CLIENT_HEADERS } from '../../client_headers';
import { deleteIndex } from './delete_index';

export async function cleanMonitoringIndices({
  client,
  stats,
  log,
}: {
  client: KibanaClient;
  stats: Stats;
  log: ToolingLog;
}) {
  deleteMonitoringIndices({ client, stats, log });
}

/**
 * Deletes all indices that start with `.monitoring`
 */
export async function deleteMonitoringIndices({
  client,
  stats,
  log,
}: {
  client: KibanaClient;
  stats: Stats;
  log: ToolingLog;
}) {
  const indexNames = await fetchMonitoringIndices(client);
  if (!indexNames.length) {
    return;
  }

  await client.indices.putSettings(
    {
      index: indexNames,
      body: { settings: { blocks: { read_only: false } } },
    },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );

  await deleteIndex({
    client,
    stats,
    index: indexNames,
    log,
  });

  return indexNames;
}

async function fetchMonitoringIndices(client: KibanaClient) {
  const resp = await client.cat.indices(
    { index: '.monitoring-*', format: 'json' },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );

  if (!Array.isArray(resp.body)) {
    throw new Error(`expected response to be an array ${inspect(resp.body)}`);
  }

  return resp.body.map((x: { index?: string }) => x.index).filter(isMonitoringIndex);
}

function isMonitoringIndex(index?: string): index is string {
  return Boolean(index && /^\.monitoring-.*$/.test(index));
}
