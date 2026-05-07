/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AttentionReason, EnvironmentHealthResponse } from '../../common/environment_health';
import { MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME } from '../../common/environment_health';

const TIMEOUT_MS = 15_000;

function isRgb(s: string | undefined): s is 'green' | 'yellow' | 'red' {
  return s === 'green' || s === 'yellow' || s === 'red';
}

/** Count enabled alerting rules via a direct SO index query (avoids a plugin dependency cycle). */
async function fetchActiveRulesCount(esClient: ElasticsearchClient): Promise<number | undefined> {
  const result = await esClient.count(
    {
      index: '.kibana_alerting_cases*',
      query: {
        bool: {
          filter: [{ term: { type: 'alert' } }, { term: { 'alert.enabled': true } }],
        },
      },
    },
    { requestTimeout: TIMEOUT_MS }
  );
  return result.count;
}

/** Stub pending-report jobs until reporting exposes a real count via API (landing prototype). */
const STUB_PENDING_REPORTS_COUNT = 3;

/** Best-effort ES snapshot for the management landing prototype. */
export async function buildEnvironmentHealthResponse(
  esClient: ElasticsearchClient
): Promise<EnvironmentHealthResponse> {
  const reasons: AttentionReason[] = [];
  const out: EnvironmentHealthResponse = {
    attentionReasons: reasons,
    // Reporting pipeline does not expose this yet — ship a stable placeholder for the strip.
    pendingReportsCount: STUB_PENDING_REPORTS_COUNT,
  };

  const [healthR, statsR, streamsR, rulesR] = await Promise.allSettled([
    esClient.cluster.health(
      { filter_path: 'cluster_name,status,unassigned_shards,timed_out' },
      { requestTimeout: TIMEOUT_MS }
    ),
    esClient.cluster.stats(
      { filter_path: 'cluster_name,indices.count' },
      { requestTimeout: TIMEOUT_MS }
    ),
    esClient.indices.getDataStream(
      { name: '*', expand_wildcards: 'all' },
      { requestTimeout: TIMEOUT_MS }
    ),
    fetchActiveRulesCount(esClient),
  ]);

  if (healthR.status === 'fulfilled') {
    const h = healthR.value;
    if (typeof h.cluster_name === 'string') {
      out.clusterName = h.cluster_name;
    }
    if (isRgb(h.status)) {
      out.healthStatus = h.status;
    }
    if (h.timed_out === true) {
      reasons.push('health_check_timed_out');
    }
    if (h.status === 'red') {
      reasons.push('cluster_red');
    } else if (h.status === 'yellow') {
      reasons.push('cluster_yellow');
    }
    const unassigned = h.unassigned_shards ?? 0;
    if (unassigned > 0) {
      reasons.push('unassigned_shards');
    }
  }

  if (statsR.status === 'fulfilled') {
    const s = statsR.value;
    if (!out.clusterName && typeof s.cluster_name === 'string') {
      out.clusterName = s.cluster_name;
    }
    if (typeof s.indices?.count === 'number') {
      out.indicesCount = s.indices.count;
    }
  }

  if (streamsR.status === 'fulfilled') {
    const n = streamsR.value.data_streams?.length;
    if (typeof n === 'number') {
      out.dataStreamsCount = n;
    }
  }

  if (rulesR.status === 'fulfilled' && typeof rulesR.value === 'number') {
    out.activeRulesCount = rulesR.value;
  }

  if (out.clusterName === 'elasticsearch') {
    out.clusterName = MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME;
  }

  return out;
}
