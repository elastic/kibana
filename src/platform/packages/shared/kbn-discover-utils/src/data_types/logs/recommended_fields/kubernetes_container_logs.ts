/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Configuration for Kubernetes Container Logs profile recommended fields
 */
export const KUBERNETES_CONTAINER_LOGS_PROFILE = {
  pattern: 'logs-kubernetes.container_logs',
  recommendedFields: [
    'container.image.name',
    'kubernetes.container.name',
    'kubernetes.namespace',
    'kubernetes.node.name',
    'kubernetes.pod.name',
    'log.level',
    'message',
    'orchestrator.resource.name',
  ],
} as const;

export type KubernetesContainerLogsProfile = typeof KUBERNETES_CONTAINER_LOGS_PROFILE;
