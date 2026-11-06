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

export type DeploymentType = 'serverless' | 'ech' | 'ece' | 'self-managed';

export interface DeploymentInfo {
  type: DeploymentType;
  /** The Kibana version, which is also the version of the stack the deployment runs. */
  version: string;
  /** The kind of serverless project, such as `es`, `oblt` or `security`. */
  projectType?: string;
}

/**
 * Tells where Kibana, and with it Elasticsearch, runs: Elastic Cloud Serverless, Elastic Cloud
 * Hosted, Elastic Cloud Enterprise, or a cluster that the user manages. Without the cloud plugin
 * the build flavor still tells serverless from the rest, and anything else is self-managed.
 */
export const getDeploymentInfo = (
  env: PluginInitializerContext['env'],
  cloud?: Pick<CloudSetup, 'isCloudEnabled' | 'isServerlessEnabled' | 'isEce' | 'serverless'>
): DeploymentInfo => {
  const { version, buildFlavor } = env.packageInfo;

  if (buildFlavor === 'serverless' || cloud?.isServerlessEnabled) {
    return { type: 'serverless', version, projectType: cloud?.serverless?.projectType };
  }
  if (cloud?.isCloudEnabled) {
    return { type: cloud.isEce ? 'ece' : 'ech', version };
  }
  return { type: 'self-managed', version };
};

const DEPLOYMENT_NAMES: Record<DeploymentType, string> = {
  serverless: 'Elastic Cloud Serverless',
  ech: 'Elastic Cloud Hosted (ECH)',
  ece: 'Elastic Cloud Enterprise (ECE)',
  'self-managed': 'self-managed, where the user runs the nodes',
};

/** A one-line description of the deployment, for a prompt. */
export const describeDeployment = ({ type, version, projectType }: DeploymentInfo): string =>
  `${DEPLOYMENT_NAMES[type]}${projectType ? `, ${projectType} project` : ''}, version ${version}`;
