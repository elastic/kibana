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
import { PAGE_ID_KEY } from './page_ids';
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

type FindEnabledPageWorkflows = (
  triggerId: string,
  spaceId: string
) => Promise<WorkflowDetailDto[]>;

/**
 * Finds the enabled workflow whose `type: page` trigger carries this `page-id`.
 *
 * Only enabled workflows are searched, so disabling the workflow or removing the
 * trigger takes the page offline with nothing to clean up — n8n's "live while active".
 * The POC filters in memory after the indexed `triggerTypes: page` query; production
 * would index page IDs next to `triggerTypes`.
 *
 * Every miss raises the same non-exposed 404, so a caller cannot tell "no such page"
 * from "page disabled".
 */
export const resolvePage = async (
  findEnabledPageWorkflows: FindEnabledPageWorkflows,
  { pageId, spaceId }: { pageId: string; spaceId: string }
): Promise<ResolvedPage> => {
  const workflows = await findEnabledPageWorkflows('page', spaceId);
  for (const workflow of workflows) {
    if (workflow.valid && workflow.definition) {
      const trigger = workflow.definition.triggers
        .filter(isPageTrigger)
        .find((candidate) => candidate[PAGE_ID_KEY] === pageId);
      if (trigger) {
        return {
          workflow,
          trigger,
          inputsSchema: trigger.inputs as JsonModelSchemaType | undefined,
        };
      }
    }
  }
  throw new ExternalResumeError('Page not found', 404);
};

export const buildPageUrl = ({
  basePath,
  pageId,
  secret,
}: {
  basePath: string;
  pageId: string;
  secret: string;
}): string =>
  `${basePath}${PAGE_FORM_API_PATH.replace('{pageId}', encodeURIComponent(pageId)).replace(
    '{secret}',
    encodeURIComponent(secret)
  )}`;

export const renderPageForm = ({
  page,
  basePath,
  pageId,
  secret,
}: {
  page: ResolvedPage;
  basePath: string;
  pageId: string;
  secret: string;
}): string =>
  renderExternalResumeFormPage({
    message: page.trigger.description ?? page.trigger.title,
    formActionUrl: buildPageUrl({ basePath, pageId, secret }),
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
