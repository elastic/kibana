/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SERVICE_NAME,
  TRANSACTION_NAME,
  SPAN_NAME,
  SERVICE_NAMESPACE,
  SERVICE_ENVIRONMENT,
  SERVICE_VERSION,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_REGION,
  HOST_NAME,
  KUBERNETES_NODE_NAME_OTEL,
  KUBERNETES_POD_NAME_OTEL,
  KUBERNETES_CLUSTER_NAME_OTEL,
  KUBERNETES_DEPLOYMENT_NAME_OTEL,
  CONTAINER_ID,
} from '@kbn/apm-types';

export const BREAKDOWN_LEGEND_CONFIG = { show: true, position: 'right' } as const;

export const TRACES_BREAKDOWN_RECOMMENDED_FIELDS = [
  SERVICE_NAME,
  TRANSACTION_NAME,
  SPAN_NAME,
  SERVICE_NAMESPACE,
  SERVICE_ENVIRONMENT,
  SERVICE_VERSION,
  CLOUD_AVAILABILITY_ZONE,
  CLOUD_REGION,
  HOST_NAME,
  KUBERNETES_NODE_NAME_OTEL,
  KUBERNETES_POD_NAME_OTEL,
  KUBERNETES_CLUSTER_NAME_OTEL,
  KUBERNETES_DEPLOYMENT_NAME_OTEL,
  CONTAINER_ID,
] as const;
