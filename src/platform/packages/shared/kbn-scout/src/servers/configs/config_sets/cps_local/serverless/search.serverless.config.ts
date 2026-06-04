/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ELASTIC_SERVERLESS_SUPERUSER,
  ELASTIC_SERVERLESS_SUPERUSER_PASSWORD,
  LINKED_CLUSTER_PORT_OFFSET,
} from '@kbn/es';
import { servers as uiamConfig } from '../../uiam_local/serverless/search.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

/**
 * EIS (Elastic Inference Service) endpoint used by both the origin and linked ES clusters.
 * Override via the `EIS_URL` env var when running Scout. Default points at the EU-West QA EIS,
 * which is the same endpoint Agent Builder devs use in `yarn es serverless ...` flows.
 */
const EIS_URL = process.env.EIS_URL || 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';

export const servers: ScoutServerConfig = {
  ...uiamConfig,
  servers: {
    ...uiamConfig.servers,
    linkedElasticsearch: {
      ...uiamConfig.servers.elasticsearch,
      port: (uiamConfig.servers.elasticsearch.port as number) + LINKED_CLUSTER_PORT_OFFSET,
      username: ELASTIC_SERVERLESS_SUPERUSER,
      password: ELASTIC_SERVERLESS_SUPERUSER_PASSWORD,
    },
  },
  esTestCluster: {
    ...uiamConfig.esTestCluster,
    serverArgs: [
      ...uiamConfig.esTestCluster.serverArgs,
      // EIS is required for Agent Builder's LLM tools to work end-to-end against this stack.
      // `linkedElasticsearch.port` + `esServerlessOptions.cps` below triggers kbn-es's
      // `runLinkedServerlessCluster` which inherits these esArgs, so the linked cluster
      // gets the same EIS endpoint without any extra config.
      `xpack.inference.elastic.url=${EIS_URL}`,
    ],
  },
  esServerlessOptions: {
    uiam: true,
    cps: true,
  },
  kbnTestServer: {
    ...uiamConfig.kbnTestServer,
    serverArgs: [
      ...uiamConfig.kbnTestServer.serverArgs,
      '--cps.cpsEnabled=true',
      // Required for Agent Builder + CPS: agent runs go through Task Manager with a fakeRequest;
      // without UIAM API keys, that fakeRequest can't fan out cross-project (ES API keys are
      // origin-scoped). See `x-pack/platform/plugins/shared/agent_builder/server/services/execution`.
      '--xpack.task_manager.api_key_type=uiam',
      '--xpack.task_manager.grant_uiam_api_keys=true',
      // Same rationale for alerting rules executing under TM. Harmless even if alerting unused.
      '--xpack.alerting.rules.apiKeyType=uiam',
    ],
  },
};
