/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { PluginInitializerContext } from '@kbn/core/server';
import type { DeploymentContext, DeploymentEnvironment } from '@kbn/agent-builder-server';

export type DeploymentInfo = Pick<DeploymentContext, 'environment' | 'version' | 'serverless'>;

type DeploymentCloudInfo = Pick<
  CloudSetup,
  'isCloudEnabled' | 'isServerlessEnabled' | 'isEce' | 'serverless'
>;

const getEnvironment = (
  isServerlessBuild: boolean,
  cloud?: DeploymentCloudInfo
): DeploymentEnvironment => {
  if (isServerlessBuild || cloud?.isServerlessEnabled) {
    return 'serverless';
  }
  if (cloud?.isCloudEnabled) {
    return cloud.isEce ? 'ece' : 'ech';
  }
  return 'self_managed';
};

/** Tells where Kibana, and with it Elasticsearch, runs. */
export const getDeploymentInfo = (
  env: PluginInitializerContext['env'],
  cloud?: DeploymentCloudInfo
): DeploymentInfo => {
  const { version, buildFlavor } = env.packageInfo;
  const environment = getEnvironment(buildFlavor === 'serverless', cloud);

  if (environment === 'serverless') {
    const { projectType, productTier } = cloud?.serverless ?? {};
    return { environment, ...(projectType ? { serverless: { projectType, productTier } } : {}) };
  }
  return { environment, version };
};

const ENVIRONMENT_NAMES: Record<DeploymentEnvironment, string> = {
  serverless: 'Elastic Cloud Serverless',
  ech: 'Elastic Cloud Hosted (ECH)',
  ece: 'Elastic Cloud Enterprise (ECE)',
  self_managed: 'self-managed, where the user runs the nodes',
};

export const describeDeployment = ({ environment, version, serverless }: DeploymentInfo): string =>
  [
    ENVIRONMENT_NAMES[environment],
    serverless ? `${serverless.projectType} project` : undefined,
    version ? `version ${version}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
