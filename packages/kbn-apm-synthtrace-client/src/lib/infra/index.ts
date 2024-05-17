/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DockerContainerMetricsDocument, dockerContainer } from './docker_container';
import { HostMetricsDocument, host } from './host';
import { K8sContainerMetricsDocument, k8sContainer } from './k8s_container';
import { PodMetricsDocument, pod } from './pod';

export type InfraDocument =
  | HostMetricsDocument
  | PodMetricsDocument
  | DockerContainerMetricsDocument
  | K8sContainerMetricsDocument;

export const infra = {
  host,
  pod,
  dockerContainer,
  k8sContainer,
};
