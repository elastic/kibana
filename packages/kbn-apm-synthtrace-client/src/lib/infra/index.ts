/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { container, ContainerMetricsDocument } from './container';
import { host, HostMetricsDocument } from './host';
import { pod, PodMetricsDocument } from './pod';
import { awsRds, AWSRdsMetricsDocument } from './aws/rds';

export type InfraDocument =
  | HostMetricsDocument
  | PodMetricsDocument
  | ContainerMetricsDocument
  | AWSRdsMetricsDocument;

export const infra = {
  host,
  pod,
  container,
  awsRds,
};
