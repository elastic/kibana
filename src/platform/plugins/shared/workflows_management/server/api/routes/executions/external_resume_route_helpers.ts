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
    reason: 'External resume uses a short-lived API key token instead of a Kibana session.',
  },
  authz: {
    enabled: false,
    reason: 'External resume authorizes by matching the API key metadata to the execution.',
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

export function htmlOk(response: KibanaResponseFactory, body: string) {
  return response.ok({
    body,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });
}

export function handleExternalResumeError(
  response: KibanaResponseFactory,
  error: unknown,
  logger?: Logger
) {
  if (error instanceof ExternalResumeError) {
    return htmlError(response, error.statusCode, error.message);
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
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });
}

export function htmlSuccess(response: KibanaResponseFactory) {
  return htmlOk(response, renderExternalResumeSuccessPage());
}
