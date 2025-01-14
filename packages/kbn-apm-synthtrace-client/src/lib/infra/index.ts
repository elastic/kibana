/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dockerContainer, type DockerContainerMetricsDocument } from './docker_container';
import { host, type HostMetricsDocument, minimalHost } from './host';
import { k8sContainer, type K8sContainerMetricsDocument } from './k8s_container';
import { pod, type PodMetricsDocument } from './pod';
import { awsRds, type AWSRdsMetricsDocument } from './aws/rds';
import { k8sNode, type K8sNodeMetricsDocument } from './k8s_node';

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
