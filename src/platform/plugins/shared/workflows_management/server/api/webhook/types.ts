/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface WebhookCredentialDocument {
  spaceId: string;
  workflowId: string;
  authType: 'none' | 'apiKey' | 'basic';
  apiKeyId?: string;
  username?: string;
  passwordHash?: string;
  dispatchTaskId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookInvocationDocument {
  spaceId: string;
  workflowId: string;
  inputs: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  workflowExecutionId?: string;
  error?: string;
}

export interface WebhookDispatchTaskParams {
  workflowId: string;
  spaceId: string;
}
