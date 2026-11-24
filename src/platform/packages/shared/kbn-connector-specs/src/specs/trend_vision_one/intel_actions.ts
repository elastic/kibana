/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosError } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { getHeader, readQuota, vendorRequest } from './client';
import { ACTION_DESCRIPTIONS } from './descriptions';
import type { ListOutcome } from './multi_status';
import { toListOutcome } from './multi_status';
import type {
  AddExceptionInput,
  AddSuspiciousObjectInput,
  GetSandboxResultInput,
  RemoveSuspiciousObjectInput,
  SubmitFileInput,
  SubmitUrlsInput,
} from './response_types';
import {
  AddExceptionInputSchema,
  AddSuspiciousObjectInputSchema,
  GetSandboxResultInputSchema,
  RemoveSuspiciousObjectInputSchema,
  SubmitFileInputSchema,
  SubmitUrlsInputSchema,
} from './response_types';

/** Sends one object as `[{ <type>: value, ...options }]` and reads its per-item status. */
const changeList = async (
  ctx: ActionContext,
  action: string,
  path: string,
  object: Record<string, unknown>,
  success: 'added' | 'removed'
): Promise<ListOutcome & { type: unknown; value: unknown }> => {
  const { type, value, ...options } = object;
  const item = Object.fromEntries(
    Object.entries({ [String(type)]: value, ...options }).filter(([, v]) => v !== undefined)
  );
  const { data } = await vendorRequest(ctx, {
    action,
    method: 'POST',
    path,
    data: [item],
    mutating: true,
  });
  return { type, value, ...toListOutcome(action, data, success) };
};

/** A sandbox 429 that reports no submissions left is the daily quota, not a transient limit. */
const quotaExhausted = (error: AxiosError): boolean =>
  getHeader(error.response, 'tmv1-submission-remaining-count') === '0';

const toBase64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64');

export const intelActions: ConnectorSpec['actions'] = {
  addToSuspiciousObjectList: {
    isTool: true,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.addToSuspiciousObjectList,
    input: AddSuspiciousObjectInputSchema,
    handler: async (ctx, input: AddSuspiciousObjectInput) =>
      changeList(
        ctx,
        'addToSuspiciousObjectList',
        '/threatintel/suspiciousObjects',
        input,
        'added'
      ),
  },

  removeFromSuspiciousObjectList: {
    isTool: false,
    scope: 'destroy',
    description: ACTION_DESCRIPTIONS.removeFromSuspiciousObjectList,
    input: RemoveSuspiciousObjectInputSchema,
    handler: async (ctx, input: RemoveSuspiciousObjectInput) =>
      changeList(
        ctx,
        'removeFromSuspiciousObjectList',
        '/threatintel/suspiciousObjects/delete',
        input,
        'removed'
      ),
  },

  addToExceptionList: {
    isTool: false,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.addToExceptionList,
    input: AddExceptionInputSchema,
    handler: async (ctx, input: AddExceptionInput) =>
      changeList(
        ctx,
        'addToExceptionList',
        '/threatintel/suspiciousObjectExceptions',
        input,
        'added'
      ),
  },

  submitFileToSandbox: {
    isTool: false,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.submitFileToSandbox,
    input: SubmitFileInputSchema,
    handler: async (ctx, input: SubmitFileInput) => {
      const form = new FormData();
      form.append('file', new Blob([Buffer.from(input.file, 'base64')]), input.fileName);
      if (input.documentPassword) form.append('documentPassword', toBase64(input.documentPassword));
      if (input.archivePassword) form.append('archivePassword', toBase64(input.archivePassword));
      if (input.arguments) form.append('arguments', toBase64(input.arguments));
      const response = await vendorRequest<Record<string, unknown>>(ctx, {
        action: 'submitFileToSandbox',
        method: 'POST',
        path: '/sandbox/files/analyze',
        data: form,
        mutating: true,
        noRetry: quotaExhausted,
      });
      const body = response.data ?? {};
      return {
        id: body.id ?? null,
        digest: body.digest ?? null,
        arguments: body.arguments ?? null,
        quota: readQuota(response),
      };
    },
  },

  submitUrlsToSandbox: {
    isTool: false,
    scope: 'write',
    description: ACTION_DESCRIPTIONS.submitUrlsToSandbox,
    input: SubmitUrlsInputSchema,
    handler: async (ctx, input: SubmitUrlsInput) => {
      const response = await vendorRequest<unknown[]>(ctx, {
        action: 'submitUrlsToSandbox',
        method: 'POST',
        path: '/sandbox/urls/analyze',
        data: input.urls.map((url) => ({ url })),
        mutating: true,
        noRetry: quotaExhausted,
      });
      return {
        items: Array.isArray(response.data) ? response.data : [],
        quota: readQuota(response),
      };
    },
  },

  getSandboxAnalysisResult: {
    isTool: true,
    scope: 'read',
    description: ACTION_DESCRIPTIONS.getSandboxAnalysisResult,
    input: GetSandboxResultInputSchema,
    handler: async (ctx, input: GetSandboxResultInput) => {
      const { data } = await vendorRequest<Record<string, unknown>>(ctx, {
        action: 'getSandboxAnalysisResult',
        method: 'GET',
        path: `/sandbox/analysisResults/${encodeURIComponent(input.id)}`,
        mutating: false,
        notFound: `Sandbox analysis result ${input.id} (still running, or unknown id)`,
      });
      return data ?? {};
    },
  },
};
