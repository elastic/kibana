/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash, randomUUID } from 'node:crypto';
import type { KibanaRequest } from '@kbn/core/server';
import { isWebhookTrigger, pickManagedWorkflowFields } from '@kbn/workflows';
import type {
  WebhookTrigger,
  WorkflowDetailDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';
import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import {
  getWebhookCredentialDocumentId,
  getWebhookDispatchTaskId,
  WORKFLOW_WEBHOOK_CREDENTIALS_INDEX,
  WORKFLOW_WEBHOOK_DISPATCH_TASK_TYPE,
  WORKFLOW_WEBHOOK_INVOCATIONS_INDEX,
} from './constants';
import type {
  WebhookCredentialDocument,
  WebhookInvocationDocument,
  WebhookInvocationResult,
  WebhookPrepareResult,
} from './types';
import type { WorkflowsService } from '../workflows_management_service';

type RunWorkflow = (
  workflow: WorkflowExecutionEngineModel,
  spaceId: string,
  inputs: Record<string, unknown>,
  request: KibanaRequest,
  triggeredBy?: string,
  metadata?: Record<string, unknown>
) => Promise<string>;

const hashSecret = (secret: string): string => createHash('sha256').update(secret).digest('hex');

const getAuthorizationHeader = (request: KibanaRequest): string | undefined => {
  const value = request.headers.authorization;
  return Array.isArray(value) ? value[0] : value;
};

const getQueryValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};

const getPresentedApiKey = (request: KibanaRequest): string | undefined => {
  const authorization = getAuthorizationHeader(request);
  if (authorization?.toLowerCase().startsWith('apikey ')) {
    return authorization.slice('apikey '.length).trim();
  }
  return getQueryValue((request.query as Record<string, unknown> | undefined)?.apiKey);
};

const getWebhookTrigger = (workflow: WorkflowDetailDto): WebhookTrigger | undefined =>
  workflow.definition?.triggers?.find(isWebhookTrigger);

export class WebhookTriggerService {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly runWorkflow: RunWorkflow
  ) {}

  public async prepare(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WebhookPrepareResult> {
    const workflow = await this.getWorkflowOrThrow(workflowId, spaceId);
    const trigger = this.getTriggerOrThrow(workflow);

    await this.ensureIndices();
    const coreStart = await this.workflowsService.getCoreStart();
    const pluginsStart = await this.workflowsService.getPluginsStart();
    const client = coreStart.elasticsearch.client.asInternalUser;
    const now = new Date().toISOString();
    const authType = trigger.auth?.type ?? 'none';
    const dispatchTaskId = getWebhookDispatchTaskId(spaceId, workflowId);
    const existingCredential = await this.getCredential(workflowId, spaceId);

    await pluginsStart.taskManager.removeIfExists(dispatchTaskId);
    await pluginsStart.taskManager.schedule(
      {
        id: dispatchTaskId,
        taskType: WORKFLOW_WEBHOOK_DISPATCH_TASK_TYPE,
        params: { workflowId, spaceId },
        state: {},
        schedule: { interval: '365d' },
        scope: ['workflows', `workflow:${workflowId}`],
      },
      { request }
    );

    let apiKey: WebhookPrepareResult['apiKey'];
    let apiKeyId = existingCredential?.apiKeyId;
    if (authType === 'apiKey' && !apiKeyId) {
      const result = await coreStart.elasticsearch.client
        .asScoped(request)
        .asCurrentUser.security.createApiKey({
          name: `workflow-webhook:${spaceId}:${workflowId}`,
          metadata: {
            workflowId,
            spaceId,
            purpose: 'workflow_webhook_trigger',
          },
          role_descriptors: {},
        });
      apiKeyId = result.id;
      apiKey = { id: result.id, encoded: result.encoded };
    }

    await client.index({
      index: WORKFLOW_WEBHOOK_CREDENTIALS_INDEX,
      id: getWebhookCredentialDocumentId(spaceId, workflowId),
      document: {
        spaceId,
        workflowId,
        authType,
        ...(apiKeyId ? { apiKeyId } : {}),
        ...(authType === 'basic' && trigger.auth?.type === 'basic'
          ? {
              username: trigger.auth.username,
              passwordHash: hashSecret(trigger.auth.password),
            }
          : {}),
        dispatchTaskId,
        createdAt: existingCredential?.createdAt ?? now,
        updatedAt: now,
      } satisfies WebhookCredentialDocument,
      refresh: 'wait_for',
    });

    return {
      urlPath: `/api/workflows/workflow/${encodeURIComponent(workflowId)}/execute`,
      authType,
      ...(apiKey ? { apiKey } : {}),
    };
  }

  public async enqueue(params: {
    workflowId: string;
    spaceId: string;
    inputs: Record<string, unknown>;
    request: KibanaRequest;
  }): Promise<WebhookInvocationResult> {
    const { workflowId, spaceId, inputs, request } = params;
    const workflow = await this.getWorkflowOrThrow(workflowId, spaceId);
    const trigger = this.getTriggerOrThrow(workflow);

    if (!workflow.valid) {
      throw new Error(`Workflow '${workflowId}' has validation errors and cannot be executed.`);
    }
    if (!workflow.enabled) {
      throw new Error(`Workflow '${workflowId}' is disabled and cannot be executed.`);
    }

    const credential = await this.getPreparedCredential(workflowId, spaceId, trigger);
    await this.assertAuthorized(trigger, credential, request);

    await this.ensureIndices();
    const coreStart = await this.workflowsService.getCoreStart();
    const pluginsStart = await this.workflowsService.getPluginsStart();
    const invocationId = randomUUID();
    const now = new Date().toISOString();

    await coreStart.elasticsearch.client.asInternalUser.index<WebhookInvocationDocument>({
      index: WORKFLOW_WEBHOOK_INVOCATIONS_INDEX,
      id: invocationId,
      document: {
        spaceId,
        workflowId,
        inputs,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      },
      refresh: 'wait_for',
    });

    await pluginsStart.taskManager.runSoon(credential.dispatchTaskId);
    return { invocationId, accepted: true };
  }

  public async dispatch(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    await this.ensureIndices();
    const coreStart = await this.workflowsService.getCoreStart();
    const client = coreStart.elasticsearch.client.asInternalUser;
    const invocations = await client.search<WebhookInvocationDocument>({
      index: WORKFLOW_WEBHOOK_INVOCATIONS_INDEX,
      size: 20,
      query: {
        bool: {
          filter: [
            { term: { workflowId } },
            { term: { spaceId } },
            { term: { status: 'pending' } },
          ],
        },
      },
      sort: [{ createdAt: { order: 'asc' } }],
    });

    for (const hit of invocations.hits.hits) {
      if (hit._id && hit._source) {
        await this.dispatchInvocation(hit._id, hit._source, request);
      }
    }
  }

  private async dispatchInvocation(
    invocationId: string,
    invocation: WebhookInvocationDocument,
    request: KibanaRequest
  ): Promise<void> {
    const coreStart = await this.workflowsService.getCoreStart();
    const client = coreStart.elasticsearch.client.asInternalUser;
    await client.update({
      index: WORKFLOW_WEBHOOK_INVOCATIONS_INDEX,
      id: invocationId,
      doc: { status: 'running', updatedAt: new Date().toISOString() },
    });

    try {
      const workflow = await this.getWorkflowOrThrow(invocation.workflowId, invocation.spaceId);
      if (!workflow.definition) {
        throw new WorkflowNotFoundError(invocation.workflowId);
      }
      const workflowForExecution: WorkflowExecutionEngineModel = {
        id: workflow.id,
        name: workflow.name,
        enabled: workflow.enabled,
        definition: workflow.definition,
        yaml: workflow.yaml,
        ...pickManagedWorkflowFields(workflow),
      };
      const workflowExecutionId = await this.runWorkflow(
        workflowForExecution,
        invocation.spaceId,
        invocation.inputs,
        request,
        'webhook',
        { webhookInvocationId: invocationId }
      );
      await client.update({
        index: WORKFLOW_WEBHOOK_INVOCATIONS_INDEX,
        id: invocationId,
        doc: {
          status: 'completed',
          workflowExecutionId,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      await client.update({
        index: WORKFLOW_WEBHOOK_INVOCATIONS_INDEX,
        id: invocationId,
        doc: {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          updatedAt: new Date().toISOString(),
        },
      });
    }
  }

  private async ensureIndices(): Promise<void> {
    const coreStart = await this.workflowsService.getCoreStart();
    const client = coreStart.elasticsearch.client.asInternalUser;

    if (!(await client.indices.exists({ index: WORKFLOW_WEBHOOK_CREDENTIALS_INDEX }))) {
      await client.indices.create({
        index: WORKFLOW_WEBHOOK_CREDENTIALS_INDEX,
        settings: { hidden: true },
        mappings: {
          dynamic: false,
          properties: {
            spaceId: { type: 'keyword' },
            workflowId: { type: 'keyword' },
            authType: { type: 'keyword' },
            apiKeyId: { type: 'keyword' },
            username: { type: 'keyword' },
            passwordHash: { type: 'keyword' },
            dispatchTaskId: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      });
    }

    if (!(await client.indices.exists({ index: WORKFLOW_WEBHOOK_INVOCATIONS_INDEX }))) {
      await client.indices.create({
        index: WORKFLOW_WEBHOOK_INVOCATIONS_INDEX,
        settings: { hidden: true },
        mappings: {
          dynamic: false,
          properties: {
            spaceId: { type: 'keyword' },
            workflowId: { type: 'keyword' },
            status: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
            workflowExecutionId: { type: 'keyword' },
            error: { type: 'text' },
          },
        },
      });
    }
  }

  private async getWorkflowOrThrow(
    workflowId: string,
    spaceId: string
  ): Promise<WorkflowDetailDto> {
    const workflow = await this.workflowsService.getWorkflow(workflowId, spaceId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }
    return workflow;
  }

  private getTriggerOrThrow(workflow: WorkflowDetailDto): WebhookTrigger {
    const trigger = getWebhookTrigger(workflow);
    if (!trigger) {
      throw new Error(`Workflow '${workflow.id}' does not define a webhook trigger.`);
    }
    return trigger;
  }

  private async getCredential(
    workflowId: string,
    spaceId: string
  ): Promise<WebhookCredentialDocument | undefined> {
    await this.ensureIndices();
    const coreStart = await this.workflowsService.getCoreStart();
    const result = await coreStart.elasticsearch.client.asInternalUser
      .get<WebhookCredentialDocument>({
        index: WORKFLOW_WEBHOOK_CREDENTIALS_INDEX,
        id: getWebhookCredentialDocumentId(spaceId, workflowId),
      })
      .catch(() => undefined);
    return result?._source;
  }

  private async getPreparedCredential(
    workflowId: string,
    spaceId: string,
    trigger: WebhookTrigger
  ): Promise<WebhookCredentialDocument> {
    const credential = await this.getCredential(workflowId, spaceId);
    const authType = trigger.auth?.type ?? 'none';
    if (!credential || credential.authType !== authType) {
      throw new Error('Webhook credentials have not been prepared for this workflow.');
    }
    return credential;
  }

  private async assertAuthorized(
    trigger: WebhookTrigger,
    credential: WebhookCredentialDocument,
    request: KibanaRequest
  ): Promise<void> {
    const authType = trigger.auth?.type ?? 'none';
    if (authType === 'apiKey') {
      const apiKeyId = await this.authenticatePresentedApiKey(request);
      if (!apiKeyId || apiKeyId !== credential.apiKeyId) {
        throw new Error('Webhook API key is not authorized for this workflow.');
      }
    } else if (authType === 'basic') {
      this.assertBasicAuth(credential, request);
    }
  }

  private async authenticatePresentedApiKey(request: KibanaRequest): Promise<string | undefined> {
    const presentedApiKey = getPresentedApiKey(request);
    if (!presentedApiKey) {
      return undefined;
    }
    const coreStart = await this.workflowsService.getCoreStart();
    const result = await coreStart.elasticsearch.client.asInternalUser.security.authenticate(
      undefined,
      {
        headers: { authorization: `ApiKey ${presentedApiKey}` },
      }
    );
    const apiKey = (result as { api_key?: { id?: string } }).api_key;
    return apiKey?.id;
  }

  private assertBasicAuth(credential: WebhookCredentialDocument, request: KibanaRequest): void {
    const authorization = getAuthorizationHeader(request);
    const encoded = authorization?.toLowerCase().startsWith('basic ')
      ? authorization.slice('basic '.length)
      : undefined;
    const decoded = encoded ? Buffer.from(encoded, 'base64').toString('utf8') : '';
    const separatorIndex = decoded.indexOf(':');
    const username = separatorIndex >= 0 ? decoded.slice(0, separatorIndex) : '';
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : '';
    if (username !== credential.username || hashSecret(password) !== credential.passwordHash) {
      throw new Error('Webhook basic credentials are not authorized for this workflow.');
    }
  }
}
