/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const PND_MANAGED_WORKFLOW_PLUGIN_ID = 'pnd';

export const PND_WORKER_MANAGEMENT = {
  enablement: 'restorable',
  lifecycle: 'dynamic',
  versionStrategy: 'auto',
} as const;

export const PND_RULE_WORKFLOW_MANAGEMENT = {
  enablement: 'restorable',
  lifecycle: 'static',
  versionStrategy: 'auto',
} as const;
