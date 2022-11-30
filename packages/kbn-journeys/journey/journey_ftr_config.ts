/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { v4 as uuidV4 } from 'uuid';
import { REPO_ROOT } from '@kbn/utils';
import { FtrConfigProviderContext, FtrConfigProvider } from '@kbn/test';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';

import { AnyStep } from './journey';
import { JourneyConfig } from './journey_config';
import { getAPMSettings } from './get_kibana_apm_settings';


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

    const labels: Record<string, string | boolean | undefined | number> = {
      branch: process.env.BUILDKITE_BRANCH,
      ciBuildId: process.env.BUILDKITE_BUILD_ID,
      ciBuildJobId: process.env.BUILDKITE_JOB_ID,
      ciBuildNumber: Number(process.env.BUILDKITE_BUILD_NUMBER) || 0,
      gitRev: process.env.BUILDKITE_COMMIT,
      isPr: prId !== undefined,
      ...(prId !== undefined ? { prId } : {}),
      ciBuildName: process.env.BUILDKITE_PIPELINE_SLUG,
      journeyName: config.getName(),
      performancePhase: process.env.TEST_PERFORMANCE_PHASE,
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
        delayShutdown: process.env.TEST_PERFORMANCE_PHASE === 'TEST' ? 5_000 : 0,

        serverArgs: [
          ...baseConfig.kbnTestServer.serverArgs,
          `--telemetry.optIn=${process.env.TEST_PERFORMANCE_PHASE === 'TEST'}`,
          `--telemetry.labels=${JSON.stringify(labels)}`,
          '--csp.strict=false',
          '--csp.warnLegacyBrowsers=false',
        ],

        env: {
          ...getAPMSettings(),
          ELASTIC_APM_GLOBAL_LABELS: Object.entries({
            ...config.getExtraApmLabels(),
            testJobId,
            testBuildId,
            ...labels,
          })
            .flatMap(([key, value]) => (value == null ? [] : `${key}=${value}`))
            .join(','),
        },
      },
    };
  };
}
