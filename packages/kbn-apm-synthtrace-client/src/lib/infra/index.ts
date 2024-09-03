/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dockerContainer, DockerContainerMetricsDocument } from './docker_container';
import { host, HostMetricsDocument } from './host';
import { k8sContainer, K8sContainerMetricsDocument } from './k8s_container';
import { pod, PodMetricsDocument } from './pod';
import { awsRds, AWSRdsMetricsDocument } from './aws/rds';
import { k8sNode, K8sNodeMetricsDocument } from './k8s_node';

export type InfraDocument =
  | HostMetricsDocument
  | PodMetricsDocument
  | DockerContainerMetricsDocument
  | K8sContainerMetricsDocument
  | AWSRdsMetricsDocument
  | K8sNodeMetricsDocument;

export const infra = {
  host,
  pod,
  dockerContainer,
  k8sContainer,
  awsRds,
  k8sNode,
};
