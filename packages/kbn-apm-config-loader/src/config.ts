/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join } from 'path';
import deepmerge from 'deepmerge';
import { merge, isEmpty } from 'lodash';
import { execSync } from 'child_process';
import { getDataPath } from '@kbn/utils';
import { readFileSync } from 'fs';
import type { AgentConfigOptions } from 'elastic-apm-node';
import type { AgentConfigOptions as RUMAgentConfigOptions } from '@elastic/apm-rum';
import type { ApmConfigSchema } from './apm_config';

// https://www.elastic.co/guide/en/apm/agent/nodejs/current/configuration.html
const DEFAULT_CONFIG: AgentConfigOptions = {
  active: true,
  contextPropagationOnly: true,
  environment: 'development',
  globalLabels: {},
};

export const CENTRALIZED_SERVICE_BASE_CONFIG: AgentConfigOptions | RUMAgentConfigOptions = {
  serverUrl: 'https://kibana-cloud-apm.apm.us-east-1.aws.found.io',

  // The secretToken below is intended to be hardcoded in this file even though
  // it makes it public. This is not a security/privacy issue. Normally we'd
  // instead disable the need for a secretToken in the APM Server config where
  // the data is transmitted to, but due to how it's being hosted, it's easier,
  // for now, to simply leave it in.
  secretToken: 'JpBCcOQxN81D5yucs2',

  breakdownMetrics: true,
  captureSpanStackTraces: false,
  centralConfig: false,
  metricsInterval: '30s',
  propagateTracestate: true,
  transactionSampleRate: 1.0,
};

const CENTRALIZED_SERVICE_DIST_CONFIG: AgentConfigOptions = {
  breakdownMetrics: false,
  captureBody: 'off',
  captureHeaders: false,
  metricsInterval: '120s',
  transactionSampleRate: 0.1,
};

interface KibanaRawConfig {
  elastic?: {
    apm?: ApmConfigSchema;
  };
  path?: {
    data?: string;
  };
  server?: {
    uuid?: string;
  };
}

export class ApmConfiguration {
  private baseConfig?: AgentConfigOptions;
  private kibanaVersion: string;
  private pkgBuild: Record<string, any>;

  constructor(
    private readonly rootDir: string,
    private readonly rawKibanaConfig: KibanaRawConfig,
    private readonly isDistributable: boolean
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version, build } = require(join(this.rootDir, 'package.json'));
    this.kibanaVersion = version;
    this.pkgBuild = build;
  }

  public getConfig(serviceName: string): AgentConfigOptions {
    const kibanaConfig = this.getConfigFromKibanaConfig();
    const { servicesOverrides = {} } = merge(kibanaConfig, this.getConfigFromEnv(kibanaConfig));

    let baseConfig = {
      ...this.getBaseConfig(),
      serviceName,
    };

    const serviceOverride = servicesOverrides[serviceName];
    if (serviceOverride) {
      baseConfig = merge({}, baseConfig, serviceOverride);
    }

    return baseConfig;
  }

  public isUsersRedactionEnabled(): boolean {
    const { redactUsers = true } = this.getConfigFromKibanaConfig();
    return redactUsers;
  }

  private getBaseConfig() {
    if (!this.baseConfig) {
      const configFromSources = this.getConfigFromAllSources();

      this.baseConfig = merge(
        {
          serviceVersion: this.kibanaVersion,
        },
        DEFAULT_CONFIG,
        this.getUuidConfig(),
        this.getGitConfig(),
        this.getCiConfig(),
        configFromSources
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
  private getConfigFromEnv(configFromKibanaConfig: AgentConfigOptions): AgentConfigOptions {
    const config: AgentConfigOptions = {};
    const servicesOverrides: Record<string, AgentConfigOptions> = {};

    if (process.env.ELASTIC_APM_ACTIVE === 'true') {
      config.active = true;
    }

    if (process.env.ELASTIC_APM_KIBANA_FRONTEND_ACTIVE === 'false') {
      merge(servicesOverrides, {
        'kibana-frontend': {
          active: false,
        },
      });
    }

    if (process.env.ELASTIC_APM_CONTEXT_PROPAGATION_ONLY === 'true') {
      config.contextPropagationOnly = true;
    } else if (process.env.ELASTIC_APM_CONTEXT_PROPAGATION_ONLY === 'false') {
      config.contextPropagationOnly = false;
    }

    if (process.env.ELASTIC_APM_ENVIRONMENT) {
      config.environment = process.env.ELASTIC_APM_ENVIRONMENT;
    } else {
      // We check NODE_ENV in a different way so that, unlike
      // ELASTIC_APM_ENVIRONMENT, it does not override any explicit value set
      // in the config file.
      if (!configFromKibanaConfig.environment && process.env.NODE_ENV) {
        config.environment = process.env.NODE_ENV;
      }
    }

    if (process.env.ELASTIC_APM_TRANSACTION_SAMPLE_RATE) {
      config.transactionSampleRate = parseFloat(process.env.ELASTIC_APM_TRANSACTION_SAMPLE_RATE);
    }

    if (process.env.ELASTIC_APM_SERVER_URL) {
      config.serverUrl = process.env.ELASTIC_APM_SERVER_URL;
    }

    if (process.env.ELASTIC_APM_SECRET_TOKEN) {
      config.secretToken = process.env.ELASTIC_APM_SECRET_TOKEN;
    }

    if (process.env.ELASTIC_APM_API_KEY) {
      config.apiKey = process.env.ELASTIC_APM_API_KEY;
    }

    if (process.env.ELASTIC_APM_GLOBAL_LABELS) {
      config.globalLabels = Object.fromEntries(
        process.env.ELASTIC_APM_GLOBAL_LABELS.split(',').map((p) => {
          const [key, ...val] = p.split('=');
          return [key, val.join('=')];
        })
      );
    }

    if (!isEmpty(servicesOverrides)) {
      merge(config, { servicesOverrides });
    }

    return config;
  }

  /**
   * Get the elastic.apm configuration from the --config file, supersedes the
   * default config.
   */
  private getConfigFromKibanaConfig(): ApmConfigSchema {
    return this.rawKibanaConfig?.elastic?.apm ?? {};
  }

  /**
   * Determine the Kibana UUID, initialized the value of `globalLabels.kibana_uuid`
   * when the UUID can be determined.
   */
  private getUuidConfig(): AgentConfigOptions {
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
  private getCiConfig(): AgentConfigOptions {
    if (process.env.ELASTIC_APM_ENVIRONMENT !== 'ci') {
      return {};
    }

    const isPr =
      !!process.env.BUILDKITE_PULL_REQUEST && process.env.BUILDKITE_PULL_REQUEST !== 'false';

    return {
      globalLabels: {
        branch: process.env.GIT_BRANCH || '',
        targetBranch: process.env.GITHUB_PR_TARGET_BRANCH || '',
        ciBuildNumber: process.env.BUILDKITE_BUILD_NUMBER || '',
        ciBuildId: process.env.BUILDKITE_BUILD_ID || '',
        ciBuildJobId: process.env.BUILDKITE_JOB_ID || '',
        isPr,
        prId: isPr ? process.env.BUILDKITE_PULL_REQUEST : '',
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

  /**
   * Reads APM configuration from different sources and merges them together.
   */
  private getConfigFromAllSources(): AgentConfigOptions {
    const { servicesOverrides, redactUsers, ...configFromKibanaConfig } =
      this.getConfigFromKibanaConfig();
    const configFromEnv = this.getConfigFromEnv(configFromKibanaConfig);
    const config = [configFromKibanaConfig, configFromEnv].reduce<AgentConfigOptions>(
      (acc, conf) => deepmerge(acc, conf),
      {}
    );

    if (config.active === false && config.contextPropagationOnly !== false) {
      throw new Error(
        'APM is disabled, but context propagation is enabled. Please disable context propagation with contextPropagationOnly:false'
      );
    }

    if (config.active === true) {
      config.contextPropagationOnly = config.contextPropagationOnly ?? false;
    }

    return config;
  }
}
