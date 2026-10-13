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
import { PAGE_FORM_PATH } from './constants';
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
  secret: string;
  trigger: PageTrigger;
  inputsSchema: JsonModelSchemaType | undefined;
}

export interface PageRef {
  spaceId: string;
  workflowId: string;
  secret: string;
}

interface PageLookup {
  verifyPageSecret: (ref: PageRef) => Promise<boolean>;
  getPageWorkflow: (workflowId: string, spaceId: string) => Promise<WorkflowDetailDto | null>;
}

/**
 * Loads the workflow behind a page URL.
 *
 * The URL carries the workflow id and a 256-bit secret. The secret is checked first,
 * against a stored hash, so an unknown workflow id and a wrong secret look the same.
 * Every miss raises the same non-exposed error, so a caller cannot tell "no such page"
 * from "page offline". Disabling the workflow takes the page offline; removing the page
 * trigger or rotating retires the secret.
 */
export const resolvePage = async (
  { verifyPageSecret, getPageWorkflow }: PageLookup,
  ref: PageRef
): Promise<ResolvedPage> => {
  const notFound = new ExternalResumeError('Page not found', 404);
  if (!(await verifyPageSecret(ref))) {
    throw notFound;
  }
  const workflow = await getPageWorkflow(ref.workflowId, ref.spaceId);
  if (!workflow?.enabled || !workflow.valid || !workflow.definition) {
    throw notFound;
  }
  const trigger = workflow.definition.triggers.find(isPageTrigger);
  if (!trigger) {
    throw notFound;
  }
  return {
    workflow,
    secret: ref.secret,
    trigger,
    inputsSchema: trigger.inputs as JsonModelSchemaType | undefined,
  };
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
  `${basePath}${PAGE_FORM_PATH.replace('{workflowId}', encodeURIComponent(workflowId)).replace(
    '{secret}',
    encodeURIComponent(secret)
  )}`;

export const renderPageForm = ({
  page,
  basePath,
}: {
  page: ResolvedPage;
  basePath: string;
}): string =>
  renderExternalResumeFormPage({
    message: page.trigger.description ?? page.trigger.title,
    formActionUrl: buildPageUrl({ basePath, workflowId: page.workflow.id, secret: page.secret }),
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
