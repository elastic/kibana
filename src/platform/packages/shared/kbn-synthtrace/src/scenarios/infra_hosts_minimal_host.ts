/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates a single minimal ECS infrastructure host named "minimal-host" for the Hosts page.
 *
 * Goal:
 * - Reproduce a minimal Hosts page state with one visible host row, similar to a
 *   screenshot showing a single `minimal-host` in the host table.
 *
 * Data shape:
 * - ECS infrastructure identity/routing docs only
 * - no numeric system metric fields, so the page shows a host row without
 *   utilization/throughput values
 * - `labels.synthtrace_environment` is set from this filename so the generated
 *   docs can be isolated in Elasticsearch queries.
 *
 * Scenario options:
 * - hostName (string, default: "minimal-host"): host.name / host.hostname
 *
 * Run:
 *   node scripts/synthtrace infra_hosts_minimal_host --from now-15m --to now
 *
 * Manual live run (optional):
 *   node scripts/synthtrace infra_hosts_minimal_host --live --from now-15m --to now
 *
 * Validation:
 *   Search the `metrics-system-*` index pattern with:
 *   {
 *     "query": {
 *       "bool": {
 *         "filter": [
 *           { "term": { "host.name": "minimal-host" } },
 *           { "term": { "labels.synthtrace_environment": "infra_hosts_minimal_host" } }
 *         ]
 *       }
 *     }
 *   }
 */

import { Serializable, type InfraDocument } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import type { RunOptions } from '../cli/utils/parse_run_cli_flags';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';
import { getStringOpt } from './helpers/scenario_opts_helpers';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<InfraDocument> = async (runOptions: RunOptions) => {
  const hostName = getStringOpt(runOptions.scenarioOpts, 'hostName') ?? 'minimal-host';
  const hostDocument = {
    'agent.id': 'synthtrace',
    'event.dataset': 'system.cpu',
    'event.module': 'system',
    'host.name': hostName,
    'host.hostname': hostName,
    'labels.synthtrace_environment': ENVIRONMENT,
    'metricset.name': 'cpu',
    'metricset.period': 10000,
  } as InfraDocument;

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const metrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) => [
          new Serializable<InfraDocument>({ ...hostDocument }).timestamp(timestamp),
        ]);

      return withClient(infraEsClient, metrics);
    },
  };
};

export default scenario;
