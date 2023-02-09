/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { v4 as uuidV4 } from 'uuid';
import { REPO_ROOT } from '@kbn/repo-info';
import type { FtrConfigProviderContext, FtrConfigProvider } from '@kbn/test';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';

import { AnyStep } from './journey';
import { JourneyConfig } from './journey_config';

// These "secret" values are intentionally written in the source. We would make the APM server accept anonymous traffic if we could
const APM_SERVER_URL = 'https://kibana-ops-e2e-perf.apm.us-central1.gcp.cloud.es.io:443';
const APM_PUBLIC_TOKEN = 'CTs9y3cvcfq13bQqsB';

export function makeFtrConfigProvider(
  config: JourneyConfig<any>,
  steps: AnyStep[]
): FtrConfigProvider {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const baseConfig = (
      await readConfigFile(
        Path.resolve(
          REPO_ROOT,
          config.isXpack()
            ? 'x-pack/test/functional/config.base.js'
            : 'test/functional/config.base.js'
        )
      )
    ).getAll();

    const testBuildId = process.env.BUILDKITE_BUILD_ID ?? `local-${uuidV4()}`;
    const testJobId = process.env.BUILDKITE_JOB_ID ?? `local-${uuidV4()}`;
    const prId = process.env.GITHUB_PR_NUMBER
      ? Number.parseInt(process.env.GITHUB_PR_NUMBER, 10)
      : undefined;

    if (Number.isNaN(prId)) {
      throw new Error('invalid GITHUB_PR_NUMBER environment variable');
    }

    // Set variable to collect performance events using EBT
    const enableTelemetry = !!process.env.PERFORMANCE_ENABLE_TELEMETRY;

    const telemetryLabels: Record<string, string | boolean | undefined | number> = {
      branch: process.env.BUILDKITE_BRANCH,
      ciBuildId: process.env.BUILDKITE_BUILD_ID,
      ciBuildJobId: process.env.BUILDKITE_JOB_ID,
      ciBuildNumber: Number(process.env.BUILDKITE_BUILD_NUMBER) || 0,
      gitRev: process.env.BUILDKITE_COMMIT,
      isPr: prId !== undefined,
      ...(prId !== undefined ? { prId } : {}),
      ciBuildName: process.env.BUILDKITE_PIPELINE_SLUG,
      journeyName: config.getName(),
    };

    return {
      ...baseConfig,

      mochaOpts: {
        ...baseConfig.mochaOpts,
        bail: true,
      },

      services: commonFunctionalServices,
      pageObjects: {},

      servicesRequiredForTestAnalysis: ['performance', 'journeyConfig'],

      junit: {
        reportName: `Journey: ${config.getName()}`,
        metadata: {
          journeyName: config.getName(),
          stepNames: steps.map((s) => s.name),
        },
      },

      kbnTestServer: {
        ...baseConfig.kbnTestServer,
        // delay shutdown to ensure that APM can report the data it collects during test execution
        delayShutdown: process.env.TEST_PERFORMANCE_PHASE === 'TEST' ? 15_000 : 0,

        serverArgs: [
          ...baseConfig.kbnTestServer.serverArgs,
          `--telemetry.optIn=${enableTelemetry && process.env.TEST_PERFORMANCE_PHASE === 'TEST'}`,
          `--telemetry.labels=${JSON.stringify(telemetryLabels)}`,
          '--csp.strict=false',
          '--csp.warnLegacyBrowsers=false',
        ],

        env: {
          ELASTIC_APM_ACTIVE: 'true',
          ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: 'false',
          ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
          ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '1.0',
          ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
          ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
          // capture request body for both errors and request transactions
          // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#capture-body
          ELASTIC_APM_CAPTURE_BODY: 'all',
          // capture request headers
          // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#capture-headers
          ELASTIC_APM_CAPTURE_HEADERS: true,
          // request body with bigger size will be trimmed.
          // 300_000 is the default of the APM server.
          // for a body with larger size, we might need to reconfigure the APM server to increase the limit.
          // https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html#long-field-max-length
          ELASTIC_APM_LONG_FIELD_MAX_LENGTH: 300_000,
          ELASTIC_APM_GLOBAL_LABELS: Object.entries({
            ...config.getExtraApmLabels(),
            testJobId,
            testBuildId,
            journeyName: config.getName(),
            ftrConfig: config.getRepoRelPath(),
            performancePhase: process.env.TEST_PERFORMANCE_PHASE,
            branch: process.env.BUILDKITE_BRANCH,
            gitRev: process.env.BUILDKITE_COMMIT,
            ciBuildName: process.env.BUILDKITE_PIPELINE_SLUG,
          })
            .flatMap(([key, value]) => (value == null ? [] : `${key}=${value}`))
            .join(','),
        },
      },
    };
  };
}
