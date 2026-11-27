/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { SANDBOX_POLL_INTERVAL_MS } from './constants';
import { falconMessage, falconRequest, resourcesOf, timing } from './client';

type JsonObject = Record<string, unknown>;

export interface SandboxOptions {
  environment_id?: number;
  action_script?: string;
  submission_id?: string;
  timeout?: number;
}

export interface DetonationResult {
  submission_id: string;
  state?: string;
  complete: boolean;
  verdict?: string;
  threat_score?: number;
  report?: unknown;
  sha256?: string;
}

const DONE_STATES = ['success', 'error'];
const DEFAULT_ENVIRONMENT = 160;

/** Submits a URL or an uploaded sample's sha256 for analysis and returns the submission id. */
export const submitToSandbox = async (
  ctx: ActionContext,
  target: { url: string } | { sha256: string },
  options: SandboxOptions,
  scope: string
): Promise<string> => {
  const response = await falconRequest(ctx, {
    method: 'POST',
    path: '/falconx/entities/submissions/v1',
    data: {
      sandbox: [
        {
          ...target,
          environment_id: options.environment_id ?? DEFAULT_ENVIRONMENT,
          ...(options.action_script ? { action_script: options.action_script } : {}),
        },
      ],
    },
    retryServerErrors: false,
    scope,
  });
  const id = resourcesOf<{ id?: string }>(response.data)[0]?.id;
  if (!id) {
    throw new Error(
      `Falcon Sandbox did not accept the submission: ${falconMessage(response.data)}`
    );
  }
  return id;
};

/** Uploads a sample (multipart) and returns its sha256. */
export const uploadSample = async (
  ctx: ActionContext,
  contentBase64: string,
  fileName: string,
  scope: string
): Promise<string> => {
  const form = new FormData();
  form.append('sample', new Blob([Buffer.from(contentBase64, 'base64')]), fileName);
  form.append('file_name', fileName);
  form.append('is_confidential', 'true');
  const response = await falconRequest(ctx, {
    method: 'POST',
    path: '/samples/entities/samples/v3',
    data: form,
    retryServerErrors: false,
    scope,
  });
  const sha256 = resourcesOf<{ sha256?: string }>(response.data)[0]?.sha256;
  if (!sha256) {
    throw new Error(`Falcon did not accept the sample: ${falconMessage(response.data)}`);
  }
  return sha256;
};

const getSubmission = async (ctx: ActionContext, id: string, scope: string) => {
  const response = await falconRequest(ctx, {
    method: 'GET',
    path: '/falconx/entities/submissions/v1',
    params: { ids: [id] },
    retryServerErrors: true,
    scope,
  });
  const submission = resourcesOf<JsonObject>(response.data)[0];
  if (!submission) {
    throw new Error(`Status code: 404. Message: submission ${id} was not found`);
  }
  return submission;
};

/**
 * Waits up to `timeout` seconds (polling every 10 s) for a submission to finish, then reads its
 * report summary. When it is still running, returns complete=false and the submission id.
 */
export const awaitDetonation = async (
  ctx: ActionContext,
  submissionId: string,
  timeoutSeconds: number,
  scope: string
): Promise<DetonationResult> => {
  const deadline = timing.now() + timeoutSeconds * 1000;
  let submission = await getSubmission(ctx, submissionId, scope);
  while (!DONE_STATES.includes(String(submission.state)) && timing.now() < deadline) {
    await timing.sleep(Math.min(SANDBOX_POLL_INTERVAL_MS, Math.max(0, deadline - timing.now())));
    submission = await getSubmission(ctx, submissionId, scope);
  }
  const state = typeof submission.state === 'string' ? submission.state : undefined;
  const sandbox = Array.isArray(submission.sandbox) ? (submission.sandbox[0] as JsonObject) : {};
  const sha256 = typeof sandbox?.sha256 === 'string' ? sandbox.sha256 : undefined;
  if (state !== 'success') {
    return { submission_id: submissionId, state, complete: state === 'error', sha256 };
  }
  const summary = await falconRequest(ctx, {
    method: 'GET',
    path: '/falconx/entities/report-summaries/v1',
    params: { ids: [submissionId] },
    retryServerErrors: true,
    scope,
  });
  const report = resourcesOf<JsonObject>(summary.data)[0];
  const reportSandbox = Array.isArray(report?.sandbox) ? (report.sandbox[0] as JsonObject) : {};
  const verdict = report?.verdict ?? reportSandbox?.verdict;
  const threatScore = reportSandbox?.threat_score;
  return {
    submission_id: submissionId,
    state,
    complete: true,
    verdict: typeof verdict === 'string' ? verdict : undefined,
    threat_score: typeof threatScore === 'number' ? threatScore : undefined,
    report,
    sha256: typeof reportSandbox?.sha256 === 'string' ? reportSandbox.sha256 : sha256,
  };
};
