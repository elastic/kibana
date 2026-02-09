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
import {
  type FtrConfigProviderContext,
  type FtrConfigProvider,
  defineDockerServersConfig,
  fleetPackageRegistryDockerImage,
} from '@kbn/test';
import path from 'path';
import apm from 'elastic-apm-node';
import { services } from '../services';
import type { AnyStep } from './journey';
import type { JourneyConfig } from './journey_config';
import { JOURNEY_APM_CONFIG } from './journey_apm_config';

export function makeFtrConfigProvider(
  config: JourneyConfig<any>,
  steps: AnyStep[]
): FtrConfigProvider {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const isServerless = !!process.env.TEST_SERVERLESS;
    // Use the same serverless FTR config for all journeys
    const configPath = isServerless
      ? 'x-pack/platform/test/serverless/shared/config.base.ts'
      : config.getFtrConfigPath();
    const defaultConfigPath = config.isXpack()
      ? 'x-pack/performance/configs/http2_config.ts'
      : 'src/platform/test/functional/config.base.http2.ts';
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

    const allApmLabels = {
      ...config.getExtraApmLabels(),
      testJobId,
      testBuildId,
      journeyName: config.getName(),
      ftrConfig: config.getRepoRelPath(),
      ...JOURNEY_APM_CONFIG.globalLabels,
    };

    Object.entries(allApmLabels).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        apm.setGlobalLabel(key, value);
      }
    });

    const allApmLabelsStringified = Object.entries(allApmLabels)
      .flatMap(([key, value]) => (value === null || value === undefined ? [] : `${key}=${value}`))
      .join(',');

    /**
     * This is used by CI to set the docker registry port
     * you can also define this environment variable locally when running tests which
     * will spin up a local docker package registry locally for you
     * if this is defined it takes precedence over the `packageRegistryOverride` variable
     */
    const dockerRegistryPort: string | undefined = process.env.FLEET_PACKAGE_REGISTRY_PORT;

    const packageRegistryConfig = path.join(__dirname, '../fixtures/package_registry_config.yml');
    const dockerArgs: string[] = ['-v', `${packageRegistryConfig}:/package-registry/config.yml`];

    return {
      ...baseConfig,

      dockerServers: defineDockerServersConfig({
        registry: {
          enabled: !!dockerRegistryPort,
          image: fleetPackageRegistryDockerImage,
          portInContainer: 8080,
          port: dockerRegistryPort,
          args: dockerArgs,
          waitForLogLine: 'package manifests loaded',
          waitForLogLineTimeoutMs: 60 * 6 * 1000, // 6 minutes
          preferCached: true,
        },
      }),

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
          ELASTIC_APM_CAPTURE_BODY: JOURNEY_APM_CONFIG.captureBody,
          ELASTIC_APM_CAPTURE_HEADERS: JOURNEY_APM_CONFIG.captureRequestHeaders,
          ELASTIC_APM_LONG_FIELD_MAX_LENGTH: JOURNEY_APM_CONFIG.longFieldMaxLength,
          ELASTIC_APM_GLOBAL_LABELS: allApmLabelsStringified,
        },
      },
    };
  };
}
