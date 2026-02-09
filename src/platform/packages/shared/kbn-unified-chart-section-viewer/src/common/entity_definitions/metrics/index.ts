/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HOST_METRICS, CONTAINER_METRICS, PROCESS_METRICS } from './infrastructure';
import {
  K8S_POD_METRICS,
  K8S_NODE_METRICS,
  K8S_CONTAINER_METRICS,
  K8S_DEPLOYMENT_METRICS,
  K8S_NAMESPACE_METRICS,
} from './kubernetes';
import { EC2_METRICS, RDS_METRICS, S3_METRICS, SQS_METRICS, LAMBDA_METRICS } from './aws';
import type { CuratedMetricQuery } from '../types';

/**
 * Registry of curated metrics by entity ID
 *
 * Maps entity IDs (from EntityDefinition.id) to their curated metric queries.
 * Each entity may have multiple metrics, and each metric may have variants
 * for different data sources (OTel, ECS).
 */
export const CURATED_METRICS: Record<string, CuratedMetricQuery[]> = {
  // Infrastructure entities
  host: HOST_METRICS,
  container: CONTAINER_METRICS,
  process: PROCESS_METRICS,

  // Kubernetes entities
  'k8s.pod': K8S_POD_METRICS,
  'k8s.node': K8S_NODE_METRICS,
  'k8s.container': K8S_CONTAINER_METRICS,
  'k8s.deployment': K8S_DEPLOYMENT_METRICS,
  'k8s.namespace': K8S_NAMESPACE_METRICS,

  // AWS entities
  'aws.ec2': EC2_METRICS,
  'aws.rds': RDS_METRICS,
  'aws.s3': S3_METRICS,
  'aws.sqs': SQS_METRICS,
  'aws.lambda': LAMBDA_METRICS,
};

// Re-export individual metric arrays for direct access if needed
export {
  HOST_METRICS,
  CONTAINER_METRICS,
  PROCESS_METRICS,
  K8S_POD_METRICS,
  K8S_NODE_METRICS,
  K8S_CONTAINER_METRICS,
  K8S_DEPLOYMENT_METRICS,
  K8S_NAMESPACE_METRICS,
  EC2_METRICS,
  RDS_METRICS,
  S3_METRICS,
  SQS_METRICS,
  LAMBDA_METRICS,
};
