/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPageTrigger } from '@kbn/workflows';
import type { PageTrigger } from '@kbn/workflows';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { PAGE_FORM_API_PATH } from './constants';
import { verifyPageToken } from './page_token';
import { ExternalResumeError } from '../external_resume/external_resume_error';
import {
  buildExternalResumeFormFieldsHtml,
  parseExternalResumeFormBody,
  validateExternalResumeInput,
} from '../external_resume/external_resume_form_fields';
import { renderExternalResumeFormPage } from '../external_resume/render_external_resume_page';

/** Where the submitting client came from. Recorded on the execution for the POC. */
export interface PageSubmitter {
  ip?: string;
  userAgent?: string;
  at: string;
}

export interface ResolvedPage<T extends WorkflowLike = WorkflowLike> {
  /** The workflow backing the page, narrowed to non-null by the checks below. */
  workflow: T;
  trigger: PageTrigger;
  inputsSchema: JsonModelSchemaType | undefined;
}

interface WorkflowLike {
  enabled: boolean;
  valid: boolean;
  definition?: { triggers?: Array<{ type?: string }> } | null;
}

/**
 * Resolves the page trigger for a workflow and verifies the caller's token.
 *
 * Every failure raises the same non-exposed error so an unauthenticated caller
 * cannot tell "no such workflow" from "wrong token" from "page disabled".
 */
export const resolvePage = <T extends WorkflowLike>(
  workflow: T | undefined | null,
  {
    signingKey,
    spaceId,
    workflowId,
    token,
  }: { signingKey: string; spaceId: string; workflowId: string; token: string }
): ResolvedPage<T> => {
  if (!verifyPageToken(signingKey, spaceId, workflowId, token)) {
    throw new ExternalResumeError('Invalid page token', 401);
  }
  if (!workflow || !workflow.valid || !workflow.definition) {
    throw new ExternalResumeError('Page not found', 404);
  }
  if (!workflow.enabled) {
    throw new ExternalResumeError('Page is not published', 404);
  }

  const trigger = (workflow.definition.triggers ?? []).find(isPageTrigger);
  if (!trigger) {
    throw new ExternalResumeError('Workflow does not define a page trigger', 404);
  }

  return {
    workflow,
    trigger,
    inputsSchema: trigger.inputs as JsonModelSchemaType | undefined,
  };
};

export const buildPageFormUrl = ({
  basePath,
  workflowId,
  token,
}: {
  basePath: string;
  workflowId: string;
  token: string;
}): string => {
  const path = PAGE_FORM_API_PATH.replace('{workflowId}', encodeURIComponent(workflowId));
  const params = new URLSearchParams({ token });
  return `${basePath}${path}?${params.toString()}`;
};

export const renderPageForm = ({
  page,
  basePath,
  workflowId,
  token,
}: {
  page: ResolvedPage;
  basePath: string;
  workflowId: string;
  token: string;
}): string =>
  renderExternalResumeFormPage({
    message: page.trigger.description ?? page.trigger.title,
    formActionUrl: buildPageFormUrl({ basePath, workflowId, token }),
    fieldsHtml: buildExternalResumeFormFieldsHtml(page.inputsSchema),
  });

/** Validates a submission against the page's declared input schema. */
export const parsePageSubmission = (
  body: Record<string, unknown>,
  inputsSchema: JsonModelSchemaType | undefined
): Record<string, unknown> => {
  try {
    return validateExternalResumeInput(
      parseExternalResumeFormBody(body, inputsSchema),
      inputsSchema
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid form submission';
    throw new ExternalResumeError(message, 400, true);
  }
};

/**
 * Captures the submitter's network identity. Workflows records nothing like this
 * today — HITL external resume stores only `external_resume:<stepExecutionId>`,
 * which names the link rather than the person.
 */
export const getPageSubmitter = (
  headers: Record<string, unknown>,
  remoteAddress?: string
): PageSubmitter => {
  const forwardedFor = headers['x-forwarded-for'];
  const firstForwarded =
    typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : Array.isArray(forwardedFor)
      ? String(forwardedFor[0]).split(',')[0]?.trim()
      : undefined;
  const userAgent = headers['user-agent'];

  return {
    ip: firstForwarded || remoteAddress,
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, 512) : undefined,
    at: new Date().toISOString(),
  };
};
