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
import { normalizeInputsToJsonSchema } from '@kbn/workflows/spec/lib/input_conversion';
import { validatePageInputs } from '@kbn/workflows/spec/lib/page_inputs';
import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import type { PageInputs, PageUi } from '@kbn/workflows/spec/schema/triggers/page_trigger_schema';
import { PAGE_FORM_PATH } from './constants';
import { ExternalResumeError } from '../external_resume/external_resume_error';
import { parseExternalResumeFormBody } from '../external_resume/external_resume_form_fields';

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
  inputsSchema: PageInputs | undefined;
}

/** What the page app needs to draw the form. Nothing about the workflow itself. */
export interface PageDefinition {
  title?: string;
  description?: string;
  schema: PageInputs | undefined;
  ui: PageUi | undefined;
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
export const resolvePage = async (lookup: PageLookup, ref: PageRef): Promise<ResolvedPage> => {
  const notFound = new ExternalResumeError('Page not found', 404);
  // Called as methods, not destructured: the lookup is usually a service instance.
  if (!(await lookup.verifyPageSecret(ref))) {
    throw notFound;
  }
  const workflow = await lookup.getPageWorkflow(ref.workflowId, ref.spaceId);
  // A page runs only as the workflow's service account, so it is offline without one.
  if (
    !workflow?.enabled ||
    !workflow.valid ||
    !workflow.definition ||
    !workflow.definition.settings?.run_as
  ) {
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
    // Legacy array inputs become JSON Schema, so the page app has one shape to render.
    inputsSchema: Array.isArray(trigger.inputs)
      ? normalizeInputsToJsonSchema(trigger.inputs)
      : trigger.inputs,
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

export const toPageDefinition = ({ trigger, inputsSchema }: ResolvedPage): PageDefinition => ({
  title: trigger.title,
  description: trigger.description,
  schema: inputsSchema,
  ui: trigger.ui,
});

/**
 * Validates a submission against the page's input schema, with its `if`/`then` rules
 * applied. The page app posts JSON. A plain HTML form posts strings, so those are coerced
 * to the declared root types first.
 */
export const parsePageSubmission = (
  body: Record<string, unknown>,
  inputsSchema: PageInputs | undefined,
  { isJson = false }: { isJson?: boolean } = {}
): Record<string, unknown> => {
  let values: Record<string, unknown>;
  try {
    values = isJson
      ? body
      : parseExternalResumeFormBody(body, inputsSchema as JsonModelSchemaType | undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid form submission';
    throw new ExternalResumeError(message, 400, true);
  }
  const result = validatePageInputs(inputsSchema, values);
  if (!result.success) {
    const [issue] = result.issues;
    const field = issue?.path.join('.');
    const message = issue ? `${field ? `${field}: ` : ''}${issue.message}` : 'Invalid input';
    throw new ExternalResumeError(message, 400, true);
  }
  return result.data;
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
