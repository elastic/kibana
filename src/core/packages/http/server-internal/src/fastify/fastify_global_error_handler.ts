/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FastifyError } from '@fastify/error';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Logger } from '@kbn/logging';

import { isReplyCommitted } from './fastify_reply_utils';

const INTERNAL_MESSAGE = 'An internal server error occurred. Check Kibana server logs for details.';

function httpStatusToErrorLabel(statusCode: number, error?: FastifyError): string {
  if (statusCode === 413) {
    return 'Request Entity Too Large';
  }
  const labels: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    408: 'Request Timeout',
    409: 'Conflict',
    413: 'Request Entity Too Large',
    415: 'Unsupported Media Type',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return labels[statusCode] ?? 'Error';
}

function normalizeStatusCode(error: FastifyError): number {
  let code = error.statusCode;
  const hasValidation = Array.isArray(error.validation) && error.validation.length > 0;
  if (hasValidation) {
    code = 400;
  }
  if (code === undefined || Number.isNaN(code)) {
    return 500;
  }
  if (code < 400 || code > 599) {
    return 500;
  }
  return code;
}

/**
 * Registers {@link FastifyInstance.setErrorHandler} so failures in hooks or framework code
 * produce a single Kibana-shaped JSON body and never call `reply.send` after headers were
 * sent (avoids HTTP/2 crashes and unhandled promise rejections from Fastify internals).
 *
 * @internal
 */
export function installFastifyGlobalErrorHandler(fastify: FastifyInstance, log: Logger): void {
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (isReplyCommitted(reply)) {
      log.error(error);
      return;
    }

    const statusCode = normalizeStatusCode(error);

    log.error(error);

    const message = statusCode >= 500 ? INTERNAL_MESSAGE : error.message;

    reply.code(statusCode).send({
      statusCode,
      error: httpStatusToErrorLabel(statusCode, error),
      message,
    });
  });
}
