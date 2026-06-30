/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const WORKFLOW_WEBHOOK_DISPATCH_TASK_TYPE = 'workflow:webhook:dispatch';
export const WORKFLOW_WEBHOOK_CREDENTIALS_INDEX = '.workflows-credentials';
export const WORKFLOW_WEBHOOK_INVOCATIONS_INDEX = '.workflows-webhook-invocations';

export const getWebhookCredentialDocumentId = (spaceId: string, workflowId: string): string =>
  `${encodeURIComponent(spaceId)}:${encodeURIComponent(workflowId)}`;

export const getWebhookDispatchTaskId = (spaceId: string, workflowId: string): string =>
  `workflow-webhook-dispatch:${encodeURIComponent(spaceId)}:${encodeURIComponent(workflowId)}`;
