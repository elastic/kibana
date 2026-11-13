/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerlessProductTier, ServerlessProjectType } from '@kbn/es';
import type { ScoutTargetDomain } from '@kbn/scout-info';
import { ScoutTestTarget } from '@kbn/scout-info';
import type { ServerlessProject } from '@kbn/test-kibana-server';
import { getServerlessProject } from '@kbn/test-kibana-server';
import type { Config as FTRConfig } from '../../config';

type ServerlessProjectKey =
  | ServerlessProjectType
  | `${ServerlessProjectType}:${ServerlessProductTier}`;

export const SERVERLESS_DOMAINS: Readonly<
  Partial<Record<ServerlessProjectKey, ScoutTargetDomain>>
> = {
  es: 'search',
  'oblt:complete': 'observability_complete',
  'oblt:logs_essentials': 'observability_logs_essentials',
  'security:complete': 'security_complete',
  'security:essentials': 'security_essentials',
  'security:search_ai_lake': 'security_ease',
  workplaceai: 'workplaceai',
  vectordb: 'vectordb',
};

/**
 * Resolves the Scout test target domain of the deployment an FTR config starts, from the
 * `--serverless` project type and the security or oblt product tier Kibana is started with.
 */
export const getScoutTargetDomain = (config: FTRConfig): ScoutTargetDomain | undefined => {
  if (!config.get('serverless')) {
    return 'classic';
  }

  let serverlessProject: ServerlessProject | undefined;
  try {
    serverlessProject = getServerlessProject(config.get('kbnTestServer.serverArgs', []));
  } catch {
    // Runs against existing deployments don't start Kibana, so its arguments may never have been validated
    return undefined;
  }
  if (serverlessProject === undefined) {
    return undefined;
  }

  const { projectType, productTier } = serverlessProject;
  const key: ServerlessProjectKey =
    productTier === undefined ? projectType : `${projectType}:${productTier}`;
  return SERVERLESS_DOMAINS[key];
};

/**
 * Resolves the Scout test target of an FTR run, preferring the `SCOUT_TARGET_*` environment
 * variables and otherwise deriving it from the resolved FTR config.
 */
export const getScoutTestTarget = (config: FTRConfig): { type: string; mode: string } => {
  const envTarget = ScoutTestTarget.tryFromEnv();
  if (envTarget) {
    return { type: envTarget.location, mode: envTarget.tagWithoutLocation };
  }

  const location = process.env.TEST_CLOUD ? 'cloud' : 'local';
  const arch = config.get('serverless') ? 'serverless' : 'stateful';
  const domain = getScoutTargetDomain(config);

  return {
    type: location,
    mode: domain ? new ScoutTestTarget(location, arch, domain).tagWithoutLocation : 'unknown',
  };
};
