/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Reproduces the "missing metrics" scenario for the Hosts page (issue #267427).
 *
 * Generates three groups of hosts:
 *
 * 1. Linux hosts — emit ALL metrics (CPU, memory, network, load, filesystem, diskio).
 *    These appear fully populated in the table and KPIs.
 *
 * 2. Windows "partial" hosts — emit CPU, memory, network, filesystem, diskio but
 *    NO system.load. This is the primary bug scenario: hasSystemMetrics is true
 *    but normalizedLoad1m is null. Before the fix, the table shows "0%" instead
 *    of "N/A", and the single-host KPI shows "(blank)".
 *
 * 3. Windows "minimal" hosts — emit ONLY CPU. All other table columns (memory,
 *    disk, network, load) will be N/A. This maximizes N/A coverage for testing.
 *
 * Related:
 * - https://github.com/elastic/kibana/issues/267427
 *
 * Run:
 *   node scripts/synthtrace infra_hosts_missing_normalized_load --from now-1w --to now
 *   node scripts/synthtrace infra_hosts_missing_normalized_load --from now-1w --to now \
 *     --scenarioOpts='{"numLinuxHosts":2,"numWindowsPartialHosts":2,"numWindowsMinimalHosts":1}'
 *
 * Scenario options:
 * - numLinuxHosts (number, default: 2): full-metric hosts
 * - numWindowsPartialHosts (number, default: 2): all metrics except load (primary bug case)
 * - numWindowsMinimalHosts (number, default: 1): only CPU (maximum N/A)
 *
 * Validation:
 * - All hosts appear in metrics-system.cpu-default
 * - Linux hosts have all metricsets (cpu, memory, network, load, filesystem, diskio)
 * - Windows partial hosts have all metricsets EXCEPT load
 * - Windows minimal hosts have ONLY cpu metricset
 * - In Kibana Hosts page table:
 *   - Linux hosts: all columns populated
 *   - Windows partial hosts: normalizedLoad1m shows N/A (not 0%)
 *   - Windows minimal hosts: all columns except CPU show N/A
 * - In single-host flyout for a Windows partial host:
 *   - Normalized load KPI shows N/A or neutral state (not "(blank)")
 */

import type { InfraDocument } from '@kbn/synthtrace-client';
import { infra } from '@kbn/synthtrace-client';
import { times } from 'lodash';
import type { Scenario } from '../cli/scenario';
import { getNumberOpt } from './helpers/scenario_opts_helpers';
import { withClient } from '../lib/utils/with_client';

const scenario: Scenario<InfraDocument> = async ({ logger, scenarioOpts }) => {
  const numLinuxHosts = getNumberOpt(scenarioOpts, 'numLinuxHosts', 2);
  const numWindowsPartialHosts = getNumberOpt(scenarioOpts, 'numWindowsPartialHosts', 2);
  const numWindowsMinimalHosts = getNumberOpt(scenarioOpts, 'numWindowsMinimalHosts', 1);

  return {
    generate: ({ range, clients: { infraEsClient } }) => {
      const linuxHosts = times(numLinuxHosts).map((index) => infra.host(`linux-host-${index}`));

      const windowsPartialHosts = times(numWindowsPartialHosts).map((index) => {
        const h = infra.host(`windows-partial-${index}`);
        h.overrides({
          'host.os.name': 'Windows Server 2022',
          'host.os.platform': 'windows',
          'host.os.version': '10.0.20348',
          'cloud.provider': 'azure',
          'host.ip': `10.128.1.${index}`,
        });
        return h;
      });

      const windowsMinimalHosts = times(numWindowsMinimalHosts).map((index) => {
        const h = infra.host(`windows-minimal-${index}`);
        h.overrides({
          'host.os.name': 'Windows 11',
          'host.os.platform': 'windows',
          'host.os.version': '10.0.22631',
          'cloud.provider': 'azure',
          'host.ip': `10.128.2.${index}`,
        });
        return h;
      });

      const linuxMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          linuxHosts.flatMap((h) => [
            h.cpu().timestamp(timestamp),
            h.memory().timestamp(timestamp),
            h.network().timestamp(timestamp),
            h.load().timestamp(timestamp),
            h.filesystem().timestamp(timestamp),
            h.diskio().timestamp(timestamp),
          ])
        );

      const windowsPartialMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          windowsPartialHosts.flatMap((h) => [
            h.cpu().timestamp(timestamp),
            h.memory().timestamp(timestamp),
            h.network().timestamp(timestamp),
            // No h.load() — Windows does not report system.load.*
            h.filesystem().timestamp(timestamp),
            h.diskio().timestamp(timestamp),
          ])
        );

      const windowsMinimalMetrics = range
        .interval('30s')
        .rate(1)
        .generator((timestamp) =>
          windowsMinimalHosts.flatMap((h) => [
            h.cpu().timestamp(timestamp),
            // Only CPU — all other table metrics will be N/A
          ])
        );

      return [
        withClient(
          infraEsClient,
          logger.perf('generating_linux_hosts', () => linuxMetrics)
        ),
        withClient(
          infraEsClient,
          logger.perf('generating_windows_partial_hosts', () => windowsPartialMetrics)
        ),
        withClient(
          infraEsClient,
          logger.perf('generating_windows_minimal_hosts', () => windowsMinimalMetrics)
        ),
      ];
    },
  };
};

export default scenario;
