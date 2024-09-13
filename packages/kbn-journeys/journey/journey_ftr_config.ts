/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import { v4 as uuidV4 } from 'uuid';
import { REPO_ROOT } from '@kbn/repo-info';
import type { FtrConfigProviderContext, FtrConfigProvider } from '@kbn/test';
import { services } from '../services';

import { AnyStep } from './journey';
import { JourneyConfig } from './journey_config';
import { JOURNEY_APM_CONFIG } from './journey_apm_config';

export function makeFtrConfigProvider(
  config: JourneyConfig<any>,
  steps: AnyStep[]
): FtrConfigProvider {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const isServerless = !!process.env.TEST_SERVERLESS;
    // Use the same serverless FTR config for all journeys
    const configPath = isServerless
      ? 'x-pack/test_serverless/shared/config.base.ts'
      : config.getFtrConfigPath();
    const defaultConfigPath = config.isXpack()
      ? 'x-pack/test/functional/config.base.js'
      : 'test/functional/config.base.js';
    const ftrConfigPath = configPath ?? defaultConfigPath;
    const baseConfig = (await readConfigFile(Path.resolve(REPO_ROOT, ftrConfigPath))).getAll();

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

      services,
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
          '--coreApp.allowDynamicConfigOverrides=true',
        ],

        env: {
          ELASTIC_APM_ACTIVE: JOURNEY_APM_CONFIG.active,
          ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: JOURNEY_APM_CONFIG.contextPropagationOnly,
          ELASTIC_APM_ENVIRONMENT: JOURNEY_APM_CONFIG.environment,
          ELASTIC_APM_TRANSACTION_SAMPLE_RATE: JOURNEY_APM_CONFIG.transactionSampleRate,
          ELASTIC_APM_SERVER_URL: JOURNEY_APM_CONFIG.serverUrl,
          ELASTIC_APM_SECRET_TOKEN: JOURNEY_APM_CONFIG.secretToken,
          ELASTIC_APM_CAPTURE_BODY: JOURNEY_APM_CONFIG.captureBody,
          ELASTIC_APM_CAPTURE_HEADERS: JOURNEY_APM_CONFIG.captureRequestHeaders,
          ELASTIC_APM_LONG_FIELD_MAX_LENGTH: JOURNEY_APM_CONFIG.longFieldMaxLength,
          ELASTIC_APM_GLOBAL_LABELS: Object.entries({
            ...config.getExtraApmLabels(),
            testJobId,
            testBuildId,
            journeyName: config.getName(),
            ftrConfig: config.getRepoRelPath(),
            ...JOURNEY_APM_CONFIG.globalLabels,
          })
            .flatMap(([key, value]) => (value == null ? [] : `${key}=${value}`))
            .join(','),
        },
      },
    };
  };
}
