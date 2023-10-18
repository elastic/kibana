/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { errors, TransportResult } from '@elastic/elasticsearch';
import { EqlSearchResponse } from './types';
import { EqlSearchStrategyResponse } from '../../../../common';

/**
 * Get the Kibana representation of an EQL search response (see `IKibanaSearchResponse`).
 * (EQL does not provide _shard info, so total/loaded cannot be calculated.)
 */
export function toEqlKibanaSearchResponse(
  response: TransportResult<EqlSearchResponse>
): EqlSearchStrategyResponse {
  return {
    id: response.body.id,
    rawResponse: response,
    isPartial: response.body.is_partial,
    isRunning: response.body.is_running,
  };
}

export function errorToEqlKibanaSearchResponse(
  response: EqlResponseError
): EqlSearchStrategyResponse {
  return {
    id: undefined,
    rawResponse: response.meta,
    isPartial: false,
    isRunning: false,
  };
}

const PARSING_ERROR_TYPE = 'parsing_exception';
const VERIFICATION_ERROR_TYPE = 'verification_exception';
const MAPPING_ERROR_TYPE = 'mapping_exception';

interface ErrorCause {
  type: string;
  reason: string;
}

interface EqlErrorBody {
  error: ErrorCause & { root_cause: ErrorCause[] };
}

export interface EqlResponseError extends errors.ResponseError {
  meta: TransportResult<EqlErrorBody>;
}

const isValidationErrorType = (type: unknown): boolean =>
  type === PARSING_ERROR_TYPE || type === VERIFICATION_ERROR_TYPE || type === MAPPING_ERROR_TYPE;

export const isEqlResponseError = (response: unknown): response is EqlResponseError =>
  response instanceof errors.ResponseError;

export const isEqlValidationResponseError = (response: unknown): response is EqlResponseError =>
  isEqlResponseError(response) && isValidationErrorType(get(response, 'meta.body.error.type'));
