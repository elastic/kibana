/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPageTrigger } from '@kbn/workflows';
import type { PageTrigger, WorkflowDetailDto } from '@kbn/workflows';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { PAGE_FORM_API_PATH } from './constants';
import { verifyPageSecret } from './page_secret';
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

export interface ResolvedPage {
  workflow: WorkflowDetailDto;
  trigger: PageTrigger;
  inputsSchema: JsonModelSchemaType | undefined;
}

type GetWorkflow = (workflowId: string, spaceId: string) => Promise<WorkflowDetailDto | null>;

/** The counter the URL secret is derived from. A workflow that never rotated is at 0. */
export const getPageGeneration = (workflow: Pick<WorkflowDetailDto, 'pageGeneration'>): number =>
  workflow.pageGeneration ?? 0;

/**
 * Loads the workflow behind a page URL and checks the URL secret against it.
 *
 * The lookup is a direct get by id. The secret is checked before anything about the
 * workflow is revealed, and every miss raises the same non-exposed error, so a caller
 * cannot tell "no such workflow" from "wrong secret" from "page offline". Disabling the
 * workflow or removing its page trigger takes the page offline with nothing to clean up.
 */
export const resolvePage = async (
  getWorkflow: GetWorkflow,
  {
    signingKey,
    spaceId,
    workflowId,
    secret,
  }: { signingKey: string; spaceId: string; workflowId: string; secret: string }
): Promise<ResolvedPage> => {
  const notFound = new ExternalResumeError('Page not found', 404);
  const workflow = await getWorkflow(workflowId, spaceId);
  if (!workflow) {
    throw notFound;
  }
  const generation = getPageGeneration(workflow);
  if (!verifyPageSecret(signingKey, { spaceId, workflowId, generation }, secret)) {
    throw notFound;
  }
  if (!workflow.enabled || !workflow.valid || !workflow.definition) {
    throw notFound;
  }
  const trigger = workflow.definition.triggers.find(isPageTrigger);
  if (!trigger) {
    throw notFound;
  }
  return { workflow, trigger, inputsSchema: trigger.inputs as JsonModelSchemaType | undefined };
};

export const buildPageUrl = ({
  basePath,
  workflowId,
  secret,
}: {
  basePath: string;
  workflowId: string;
  secret: string;
}): string =>
  `${basePath}${PAGE_FORM_API_PATH.replace('{workflowId}', encodeURIComponent(workflowId)).replace(
    '{secret}',
    encodeURIComponent(secret)
  )}`;

export const renderPageForm = ({
  page,
  basePath,
  secret,
}: {
  page: ResolvedPage;
  basePath: string;
  secret: string;
}): string =>
  renderExternalResumeFormPage({
    message: page.trigger.description ?? page.trigger.title,
    formActionUrl: buildPageUrl({ basePath, workflowId: page.workflow.id, secret }),
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
