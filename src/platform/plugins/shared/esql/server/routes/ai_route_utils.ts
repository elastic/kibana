/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, KibanaResponseFactory, Logger } from '@kbn/core/server';
import { NO_AI_CONNECTOR_ERROR_CODE } from '@kbn/esql-types';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { FastInferenceEndpointsProvider } from '../types';
import { resolveConnectorId } from './helpers';

/** The chat model of the connector a request can use, or nothing when no connector is set up. */
export const getChatModelForRequest = async ({
  inference,
  request,
  searchInferenceEndpoints,
}: {
  inference: InferenceServerStart;
  request: KibanaRequest;
  searchInferenceEndpoints?: FastInferenceEndpointsProvider;
}): Promise<Awaited<ReturnType<InferenceServerStart['getChatModel']>> | undefined> => {
  const connectorId = await resolveConnectorId({ inference, request, searchInferenceEndpoints });
  return connectorId
    ? inference.getChatModel({ request, connectorId, chatModelOptions: {} })
    : undefined;
};

/** The answer to a request that needs a connector when there is none. The UI knows it by its code. */
export const noConnectorResponse = (response: KibanaResponseFactory) =>
  response.badRequest({
    body: {
      message: 'No AI connector available.',
      attributes: { code: NO_AI_CONNECTOR_ERROR_CODE },
    },
  });

const normalizeQuery = (query: string): string => query.replace(/\s+/g, ' ').trim();

/** A query the model gave back is only worth showing when it is not empty and not the same query. */
export const toUsableQuery = (suggested: string, original: string): string | null => {
  const query = suggested.trim();
  return query.length > 0 && normalizeQuery(query) !== normalizeQuery(original) ? query : null;
};

const isLicenseError = (error: unknown): boolean =>
  error instanceof Error &&
  'reason' in error &&
  typeof error.reason === 'string' &&
  error.reason.startsWith('license_');

/** Logs a failed request and answers it: 403 for a license problem, 500 for anything else. */
export const failureResponse = ({
  error,
  action,
  logger,
  response,
}: {
  error: unknown;
  /** What was being done, for the log, such as `error explanation`. */
  action: string;
  logger: Logger;
  response: KibanaResponseFactory;
}) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`ES|QL ${action} failed: ${message}`);
  return isLicenseError(error)
    ? response.forbidden({ body: { message } })
    : response.customError({ statusCode: 500, body: { message } });
};
