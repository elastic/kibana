/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import { merge } from 'lodash';
import { execSync } from 'child_process';
// deep import to avoid loading the whole package
import { getDataPath } from '@kbn/utils/target/path';
import { readFileSync } from 'fs';
import { ApmAgentConfig } from './types';

// https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html
const DEFAULT_CONFIG: ApmAgentConfig = {
  active: false,
  environment: 'development',
  logUncaughtExceptions: true,
  globalLabels: {},
};

const CENTRALIZED_SERVICE_BASE_CONFIG: ApmAgentConfig = {
  serverUrl: 'https://38b80fbd79fb4c91bae06b4642d4d093.apm.us-east-1.aws.cloud.es.io',

  // The secretToken below is intended to be hardcoded in this file even though
  // it makes it public. This is not a security/privacy issue. Normally we'd
  // instead disable the need for a secretToken in the APM Server config where
  // the data is transmitted to, but due to how it's being hosted, it's easier,
  // for now, to simply leave it in.
  secretToken: 'ZQHYvrmXEx04ozge8F',

  centralConfig: false,
  metricsInterval: '30s',
  captureSpanStackTraces: false,
  transactionSampleRate: 1.0,
  breakdownMetrics: true,
};

const CENTRALIZED_SERVICE_DIST_CONFIG: ApmAgentConfig = {
  metricsInterval: '120s',
  captureBody: 'off',
  captureHeaders: false,
  breakdownMetrics: false,
};

export class ApmConfiguration {
  private baseConfig?: ApmAgentConfig;
  private kibanaVersion: string;
  private pkgBuild: Record<string, any>;

  constructor(
    private readonly rootDir: string,
    private readonly rawKibanaConfig: Record<string, any>,
    private readonly isDistributable: boolean
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version, build } = require(join(this.rootDir, 'package.json'));
    this.kibanaVersion = version;
    this.pkgBuild = build;
  }

  public getConfig(serviceName: string): ApmAgentConfig {
    return {
      ...this.getBaseConfig(),
      serviceName,
    };
  }

  private getBaseConfig() {
    if (!this.baseConfig) {
      this.baseConfig = merge(
        {
          serviceVersion: this.kibanaVersion,
        },
        DEFAULT_CONFIG,
        this.getUuidConfig(),
        this.getGitConfig(),
        this.getCiConfig(),
        this.getConfigFromKibanaConfig(),
        this.getDevConfig(),
        this.getConfigFromEnv()
      );

      /**
       * When the user doesn't override the serverUrl we define our central APM service
       * as the serverUrl along with a few other overrides to prevent potentially
       * sensitive data from being sent to this service.
       */
      const centralizedConfig = this.isDistributable
        ? merge({}, CENTRALIZED_SERVICE_BASE_CONFIG, CENTRALIZED_SERVICE_DIST_CONFIG)
        : CENTRALIZED_SERVICE_BASE_CONFIG;

      if (
        !this.baseConfig?.serverUrl ||
        this.baseConfig.serverUrl === centralizedConfig.serverUrl
      ) {
        this.baseConfig = merge(this.baseConfig, centralizedConfig);
      }
    }

    return this.baseConfig;
  }

  /**
   * Override some config values when specific environment variables are used
   */
  private getConfigFromEnv(): ApmAgentConfig {
    const config: ApmAgentConfig = {};

    if (process.env.ELASTIC_APM_ACTIVE === 'true') {
      config.active = true;
    }

    if (process.env.ELASTIC_APM_ENVIRONMENT || process.env.NODE_ENV) {
      config.environment = process.env.ELASTIC_APM_ENVIRONMENT || process.env.NODE_ENV;
    }

    if (process.env.ELASTIC_APM_TRANSACTION_SAMPLE_RATE) {
      config.transactionSampleRate = parseFloat(process.env.ELASTIC_APM_TRANSACTION_SAMPLE_RATE);
    }

    return config;
  }

  /**
   * Get the elastic.apm configuration from the --config file, supersedes the
   * default config.
   */
  private getConfigFromKibanaConfig(): ApmAgentConfig {
    return this.rawKibanaConfig?.elastic?.apm ?? {};
  }

  /**
   * Get the configuration from the apm.dev.js file, supersedes config
   * from the --config file, disabled when running the distributable
   */
  private getDevConfig(): ApmAgentConfig {
    if (this.isDistributable) {
      return {};
    }

    try {
      const apmDevConfigPath = join(this.rootDir, 'config', 'apm.dev.js');
      return require(apmDevConfigPath);
    } catch (e) {
      return {};
    }
  }

  /**
   * Determine the Kibana UUID, initialized the value of `globalLabels.kibana_uuid`
   * when the UUID can be determined.
   */
  private getUuidConfig(): ApmAgentConfig {
    // try to access the `server.uuid` value from the config file first.
    // if not manually defined, we will then read the value from the `{DATA_FOLDER}/uuid` file.
    // note that as the file is created by the platform AFTER apm init, the file
    // will not be present at first startup, but there is nothing we can really do about that.
    const uuidFromConfig = this.rawKibanaConfig?.server?.uuid;
    if (uuidFromConfig) {
      return {
        globalLabels: {
          kibana_uuid: uuidFromConfig,
        },
      };
    }

    const dataPath: string = this.rawKibanaConfig?.path?.data || getDataPath();
    try {
      const filename = join(dataPath, 'uuid');
      const uuid = readFileSync(filename, 'utf-8');
      if (!uuid) {
        return {};
      }

      return {
        globalLabels: {
          kibana_uuid: uuid,
        },
      };
    } catch (e) {
      if (e.code === 'ENOENT') {
        return {};
      }

      throw e;
    }
  }

  /**
   * When running Kibana with ELASTIC_APM_ENVIRONMENT=ci we attempt to grab
   * some environment variables we populate in CI related to the build under test
   */
  private getCiConfig(): ApmAgentConfig {
    if (process.env.ELASTIC_APM_ENVIRONMENT !== 'ci') {
      return {};
    }

    return {
      globalLabels: {
        branch: process.env.GIT_BRANCH || '',
        targetBranch: process.env.PR_TARGET_BRANCH || '',
        ciBuildNumber: process.env.BUILD_NUMBER || '',
        isPr: process.env.GITHUB_PR_NUMBER ? true : false,
        prId: process.env.GITHUB_PR_NUMBER || '',
      },
    };
  }

  /**
   * When running from the distributable pull the build sha from the package.json
   * file. Otherwise attempt to read the current HEAD sha using `git`.
   */
  private getGitConfig() {
    if (this.isDistributable) {
      return {
        globalLabels: {
          git_rev: this.pkgBuild.sha,
        },
      };
    }

    try {
      return {
        globalLabels: {
          git_rev: execSync('git rev-parse --short HEAD', {
            encoding: 'utf-8' as BufferEncoding,
            stdio: ['ignore', 'pipe', 'ignore'],
          }).trim(),
        },
      };
    } catch {
      return {};
    }
  }
}
