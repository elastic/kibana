/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaResponseFactory, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { ExternalResumeError } from '../../external_resume/external_resume_error';
import {
  renderExternalResumeErrorPage,
  renderExternalResumeSuccessPage,
} from '../../external_resume/render_external_resume_page';
import { AVAILABILITY, OAS_TAG } from '../utils/route_constants';

export const EXTERNAL_RESUME_SECURITY = {
  authc: {
    enabled: false,
    reason: 'External resume uses a short-lived resume token instead of a Kibana session.',
  },
  authz: {
    enabled: false,
    reason: 'External resume authorizes by matching the resume token hash to the step execution.',
  },
} as const;

export const EXTERNAL_RESUME_ROUTE_OPTIONS = {
  tags: [OAS_TAG],
  availability: AVAILABILITY,
} as const;

export const EXTERNAL_RESUME_POST_ROUTE_OPTIONS = {
  ...EXTERNAL_RESUME_ROUTE_OPTIONS,
  xsrfRequired: false,
} as const;

const EXTERNAL_RESUME_UNEXPECTED_ERROR_MESSAGE = i18n.translate(
  'workflowsManagement.externalResume.unexpectedError',
  {
    defaultMessage:
      'Unable to submit response. Please try again or request a new link from the workflow owner.',
  }
);

const EXTERNAL_RESUME_INVALID_LINK_MESSAGE = i18n.translate(
  'workflowsManagement.externalResume.invalidLink',
  {
    defaultMessage:
      'This workflow response link is no longer valid. Request a new link from the workflow owner.',
  }
);

const EXTERNAL_RESUME_HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  // Belt-and-suspenders: block script execution if schema-derived markup is ever mishandled.
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
} as const;

export function htmlOk(response: KibanaResponseFactory, body: string) {
  return response.ok({
    body,
    headers: EXTERNAL_RESUME_HTML_HEADERS,
  });
}

export function handleExternalResumeError(
  response: KibanaResponseFactory,
  error: unknown,
  logger?: Logger
) {
  if (error instanceof ExternalResumeError) {
    logger?.debug(() => `External resume failed: ${error.message}`);
    return htmlError(
      response,
      error.expose ? error.statusCode : 401,
      error.expose ? error.message : EXTERNAL_RESUME_INVALID_LINK_MESSAGE
    );
  }

  logger?.debug(
    () => `External resume failed: ${error instanceof Error ? error.message : String(error)}`
  );

  return htmlError(response, 400, EXTERNAL_RESUME_UNEXPECTED_ERROR_MESSAGE);
}

function htmlError(response: KibanaResponseFactory, statusCode: number, message: string) {
  return response.custom({
    statusCode,
    bypassErrorFormat: true,
    body: renderExternalResumeErrorPage(message),
    headers: EXTERNAL_RESUME_HTML_HEADERS,
  });
}

export function htmlSuccess(response: KibanaResponseFactory) {
  return htmlOk(response, renderExternalResumeSuccessPage());
}
