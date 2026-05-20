/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { mapValues } from 'lodash';
import { load as loadYaml } from 'js-yaml';
import { REPO_ROOT } from '@kbn/repo-info';

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

// Elastic Inference Service QA base URL (Elasticsearch Cloud Connected Mode).
const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';

/** Env name shared with `@kbn/gen-ai-functional-testing` for base64-encoded preconfigured connectors. */
const AI_CONNECTORS_ENV = 'KIBANA_TESTING_AI_CONNECTORS';

interface AvailableConnector {
  name: string;
  actionTypeId: string;
  config: Record<string, unknown>;
  secrets?: Record<string, unknown>;
}

const getConnectorsFromKibanaDevYml = (): Record<string, AvailableConnector> => {
  try {
    const configDir = resolve(REPO_ROOT, './config');
    const kibanaDevConfigPath = resolve(configDir, 'kibana.dev.yml');
    if (!existsSync(kibanaDevConfigPath)) {
      return {};
    }
    const parsedConfig = (loadYaml(readFileSync(kibanaDevConfigPath, 'utf8')) || {}) as Record<
      string,
      unknown
    >;
    const preconfiguredConnectors = (parsedConfig['xpack.actions.preconfigured'] || {}) as Record<
      string,
      AvailableConnector
    >;

    return mapValues(preconfiguredConnectors, ({ actionTypeId, config, name, secrets }) => ({
      actionTypeId,
      config,
      name,
      secrets,
    }));
  } catch {
    return {};
  }
};

const loadStaticPreconfiguredConnectors = (): Record<string, AvailableConnector> => {
  const envValue = process.env[AI_CONNECTORS_ENV];
  if (envValue) {
    try {
      return JSON.parse(Buffer.from(envValue, 'base64').toString('utf8')) as Record<
        string,
        AvailableConnector
      >;
    } catch (e) {
      throw new Error(
        `Error trying to parse value from ${AI_CONNECTORS_ENV} environment variable: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
    }
  }

  if (process.env.CI) {
    throw new Error(`Can't read connectors, env variable ${AI_CONNECTORS_ENV} is not set`);
  }

  return getConnectorsFromKibanaDevYml();
};

interface DiscoveredModel {
  inferenceId: string;
  modelId: string;
  metadata?: {
    heuristics?: {
      properties?: string[];
    };
  };
}

const EIS_MODELS_PATH = resolve(REPO_ROOT, 'target/eis_models.json');

const getPreDiscoveredEisModels = (): DiscoveredModel[] => {
  if (!existsSync(EIS_MODELS_PATH)) {
    return [];
  }
  try {
    const data = JSON.parse(readFileSync(EIS_MODELS_PATH, 'utf8')) as {
      models?: DiscoveredModel[];
    };
    const models = data.models ?? [];
    return models.filter((model) => !model.metadata?.heuristics?.properties?.includes('efficient'));
  } catch {
    return [];
  }
};

const buildEisPreconfiguredConnectors = (): Record<string, unknown> => {
  const models = getPreDiscoveredEisModels();
  const connectors: Record<string, unknown> = {};

  for (const model of models) {
    const connectorId = `eis-${model.modelId}`;
    connectors[connectorId] = {
      name: `EIS ${model.modelId}`,
      actionTypeId: '.inference',
      exposeConfig: true,
      config: {
        provider: 'elastic',
        taskType: 'chat_completion',
        inferenceId: model.inferenceId,
      },
      secrets: {},
    };
  }

  return connectors;
};

const preconfiguredConnectors = {
  ...loadStaticPreconfiguredConnectors(),
  ...buildEisPreconfiguredConnectors(),
};

/**
 * Stateful defaults wired for Agent Builder smoke tests against live EIS: Elasticsearch
 * uses the QA inference endpoint, and Kibana merges static preconfigured connectors
 * (from env or `config/kibana.dev.yml`) with connectors derived from `target/eis_models.json`.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      `xpack.inference.elastic.url=${EIS_QA_URL}`,
    ],
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      `--xpack.actions.preconfigured=${JSON.stringify(preconfiguredConnectors)}`,
    ],
  },
};
