/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DockerContainerMetricsDocument } from './docker_container';
import { dockerContainer } from './docker_container';
import type { HostMetricsDocument } from './host';
import { host, minimalHost } from './host';
import type { K8sContainerMetricsDocument } from './k8s_container';
import { k8sContainer } from './k8s_container';
import type { PodMetricsDocument } from './pod';
import { pod } from './pod';
import type { AWSRdsMetricsDocument } from './aws/rds';
import { awsRds } from './aws/rds';
import type { K8sNodeMetricsDocument } from './k8s_node';
import { k8sNode } from './k8s_node';

export type InfraDocument =
  | HostMetricsDocument
  | PodMetricsDocument
  | DockerContainerMetricsDocument
  | K8sContainerMetricsDocument
  | AWSRdsMetricsDocument
  | K8sNodeMetricsDocument;

export const infra = {
  host,
  minimalHost,
  pod,
  dockerContainer,
  k8sContainer,
  awsRds,
  k8sNode,
};
