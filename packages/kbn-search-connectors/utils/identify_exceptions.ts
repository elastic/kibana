/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ElasticsearchResponseError {
  meta?: {
    body?: {
      error?: {
        type: string;
      };
    };
    statusCode?: number;
  };
  name: 'ResponseError';
}

const MISSING_ALIAS_ERROR = new RegExp(/^alias \[.+\] missing/);

export const isIndexNotFoundException = (error: ElasticsearchResponseError) =>
  error?.meta?.body?.error?.type === 'index_not_found_exception';

export const isResourceAlreadyExistsException = (error: ElasticsearchResponseError) =>
  error?.meta?.body?.error?.type === 'resource_already_exists_exception';

export const isResourceNotFoundException = (error: ElasticsearchResponseError) =>
  error?.meta?.body?.error?.type === 'resource_not_found_exception';

export const isUnauthorizedException = (error: ElasticsearchResponseError) =>
  error.meta?.statusCode === 403;

export const isNotFoundException = (error: ElasticsearchResponseError) =>
  error.meta?.statusCode === 404;

export const isIllegalArgumentException = (error: ElasticsearchResponseError) =>
  error.meta?.body?.error?.type === 'illegal_argument_exception';

export const isVersionConflictEngineException = (error: ElasticsearchResponseError) =>
  error.meta?.body?.error?.type === 'version_conflict_engine_exception';

export const isInvalidSearchApplicationNameException = (error: ElasticsearchResponseError) =>
  error.meta?.body?.error?.type === 'invalid_alias_name_exception';

export const isMissingAliasException = (error: ElasticsearchResponseError) =>
  error.meta?.statusCode === 404 &&
  typeof error.meta?.body?.error === 'string' &&
  MISSING_ALIAS_ERROR.test(error.meta?.body?.error);
