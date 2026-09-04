/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import {
  SCOUT_REPORTER_ES_API_KEY,
  SCOUT_REPORTER_ES_URL,
  SCOUT_REPORTER_ES_VERIFY_CERTS,
} from '@kbn/scout-info';
import { getValidatedESClient } from '@kbn/scout-reporting';
import type { PolicySnapshot } from '../report/schema';
import { DEFAULT_POLICY } from '../policy/policy';
import { analyzeFlakiness, writeReportToFile } from '../analyze';
import { renderSummary } from '../report/summary';

const DEFAULT_OUTPUT_PATH = 'flakiness-report.json';

// The unscoped spec-level scan reads hundreds of millions of documents; the client default of
// 60s is not enough for it.
const ES_REQUEST_TIMEOUT_MS = 300_000;

const splitList = (value: string | undefined, fallback: string[]): string[] => {
  const parsed = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
};

/**
 * Read-only analysis: queries Elasticsearch, writes a schema-validated report, and prints a
 * summary. Creates no issues and mutates nothing.
 */
export const runAnalyzeFlakinessCli = (): void => {
  void run(
    async ({ flagsReader, log }) => {
      const esURL = flagsReader.requiredString('esURL');
      const esAPIKey = flagsReader.requiredString('esAPIKey');

      const policy: PolicySnapshot = {
        ...DEFAULT_POLICY,
        lookbackDays: flagsReader.requiredNumber('lookbackDays'),
        minBuilds: flagsReader.requiredNumber('minBuilds'),
        pipelineSlugs: splitList(flagsReader.string('pipelines'), DEFAULT_POLICY.pipelineSlugs),
        branches: splitList(flagsReader.string('branches'), DEFAULT_POLICY.branches),
      };

      log.info(`Connecting to Elasticsearch at ${esURL}`);
      const es = await getValidatedESClient(
        {
          node: esURL,
          auth: { apiKey: esAPIKey },
          tls: { rejectUnauthorized: flagsReader.boolean('verifyTLSCerts') },
          requestTimeout: ES_REQUEST_TIMEOUT_MS,
          maxRetries: 1,
        },
        { log, cli: true }
      );

      const report = await analyzeFlakiness(es, { policy, log });

      const outputPath = flagsReader.requiredString('output');
      writeReportToFile(report, outputPath);

      log.write('');
      log.write(renderSummary(report));
      log.write('');
      log.success(`Wrote ${report.clusters.length} clusters to ${outputPath}`);
    },
    {
      description:
        'Analyze recurring test flakiness from Scout test events and write a flakiness report. ' +
        'Read-only: creates no GitHub issues.',
      flags: {
        string: [
          'esURL',
          'esAPIKey',
          'lookbackDays',
          'minBuilds',
          'pipelines',
          'branches',
          'output',
        ],
        boolean: ['verifyTLSCerts'],
        default: {
          esURL: SCOUT_REPORTER_ES_URL,
          esAPIKey: SCOUT_REPORTER_ES_API_KEY,
          verifyTLSCerts: SCOUT_REPORTER_ES_VERIFY_CERTS,
          lookbackDays: String(DEFAULT_POLICY.lookbackDays),
          minBuilds: String(DEFAULT_POLICY.minBuilds),
          output: DEFAULT_OUTPUT_PATH,
        },
        help: `
        --esURL           (required)  Elasticsearch URL [env: SCOUT_REPORTER_ES_URL]
        --esAPIKey        (required)  Elasticsearch API Key [env: SCOUT_REPORTER_ES_API_KEY]
        --verifyTLSCerts  (optional)  Verify TLS certificates [env: SCOUT_REPORTER_ES_VERIFY_CERTS]
        --lookbackDays    (optional)  Size of the rolling window in days (default: ${
          DEFAULT_POLICY.lookbackDays
        })
        --minBuilds       (optional)  Ignore specs with fewer builds than this (default: ${
          DEFAULT_POLICY.minBuilds
        })
        --pipelines       (optional)  Comma-separated Buildkite pipeline slugs (default: ${DEFAULT_POLICY.pipelineSlugs.join(
          ','
        )})
        --branches        (optional)  Comma-separated branches (default: ${DEFAULT_POLICY.branches.join(
          ','
        )})
        --output          (optional)  Where to write the report (default: ${DEFAULT_OUTPUT_PATH})
        `,
      },
    }
  );
};
